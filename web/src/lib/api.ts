/**
 * createApiClient — wraps axios with:
 *  - Clerk JWT injection on every request
 *  - Fallback to rich Mock API data when backend returns 502 / network error
 *  - 60s GET cache (invalidated on any mutation)
 *  - 403 plan-limit interception → fires onPlanLimitHit callback
 */
import axios from "axios";
import { getMockResponse } from "./mockApi";

export function apiBaseUrl() {
  // Support both VITE_API_URL and VITE_API_BASE_URL for compatibility
  return (
    (import.meta.env.VITE_API_URL as string | undefined) ??
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    ""
  );
}

export function createApiClient(
  getToken: () => Promise<string | null>,
  onPlanLimitHit?: (message: string) => void
) {
  const client = axios.create({
    baseURL: `${apiBaseUrl()}/api`,
    headers: { "Content-Type": "application/json" },
    timeout: 5000,
  });

  // ─── Auth injection ───
  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ─── Error Fallback (502 Bad Gateway / Network Error / ECONNREFUSED) ───
  client.interceptors.response.use(
    (res) => res,
    (error) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        onPlanLimitHit
      ) {
        const msg =
          (error.response?.data as { error?: string })?.error ??
          "You've reached a limit on your current plan.";
        onPlanLimitHit(msg);
        return Promise.reject(error);
      }

      // If backend is down (502, 503, 504, ECONNREFUSED, ERR_NETWORK, timeout), serve Mock Data
      const url = error.config?.url || "";
      const method = error.config?.method?.toUpperCase() || "GET";
      const requestData = error.config?.data ? JSON.parse(error.config.data) : undefined;
      const mock = getMockResponse(method, url, requestData);

      if (mock) {
        console.warn(`[Mock API Fallback] ${method} ${url} -> returning mock data due to server error:`, error.message);
        return Promise.resolve({
          data: mock.data,
          status: mock.status,
          statusText: "OK",
          headers: {},
          config: error.config || {},
        });
      }

      return Promise.reject(error);
    }
  );

  // ─── 60s GET cache with Mock Fallback ───
  const cache = new Map<string, { data: unknown; expiry: number }>();

  const originalGet = client.get.bind(client);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).get = async (url: string, config?: any) => {
    const params = config?.params;
    const key = params ? `${url}?${JSON.stringify(params)}` : url;
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return { data: cached.data, status: 200, statusText: "OK", headers: {}, config: config ?? {} } as any;
    }
    try {
      const response = await originalGet(url, config as never);
      cache.set(key, { data: response.data, expiry: Date.now() + 60_000 });
      return response;
    } catch (err: any) {
      const mock = getMockResponse("GET", url);
      if (mock) {
        console.warn(`[Mock API Fallback] GET ${url} -> returning mock data`);
        cache.set(key, { data: mock.data, expiry: Date.now() + 60_000 });
        return { data: mock.data, status: 200, statusText: "OK", headers: {}, config: config ?? {} } as any;
      }
      throw err;
    }
  };

  // Wrap mutations with Mock Fallback
  const wrapMutation = (methodName: "post" | "put" | "patch" | "delete") => {
    const originalMethod = client[methodName].bind(client);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (url: string, data?: any, config?: any) => {
      cache.clear();
      try {
        return await originalMethod(url, data, config);
      } catch (err: any) {
        const mock = getMockResponse(methodName.toUpperCase(), url, data);
        if (mock) {
          console.warn(`[Mock API Fallback] ${methodName.toUpperCase()} ${url} -> returning mock response`);
          return { data: mock.data, status: mock.status, statusText: "OK", headers: {}, config: config ?? {} } as any;
        }
        throw err;
      }
    };
  };

  client.post = wrapMutation("post") as typeof client.post;
  client.put = wrapMutation("put") as typeof client.put;
  client.patch = wrapMutation("patch") as typeof client.patch;
  client.delete = wrapMutation("delete") as typeof client.delete;

  return client;
}

export type SquadMember = {
  id: string;
  role: "admin" | "member";
  nickname?: string | null;
  joinedAt: string;
  user: { id: string; username: string; email: string; profileImageUrl?: string | null };
};

export type Squad = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdAt: string;
  members: SquadMember[];
};
