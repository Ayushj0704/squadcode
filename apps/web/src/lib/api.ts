import axios from "axios";

export function apiBaseUrl() {
  return (
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""
  );
}

export function createApiClient(getToken: () => Promise<string | null>) {
  const client = axios.create({
    baseURL: `${apiBaseUrl()}/api`,
    headers: { "Content-Type": "application/json" }
  });

  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const cache = new Map<string, { data: any; expiry: number }>();

  // Override GET to use cache (60 seconds TTL)
  const originalGet = client.get.bind(client);
  client.get = async (url: string, config?: any) => {
    const key = url;
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      // Simulate an Axios response
      return { data: cached.data, status: 200, statusText: "OK", headers: {}, config: {} } as any;
    }
    const response = await originalGet(url, config);
    cache.set(key, { data: response.data, expiry: Date.now() + 60000 });
    return response;
  };

  // Invalidate cache on mutations
  const invalidateAndRun = (method: Function) => async (...args: any[]) => {
    cache.clear();
    return method(...args);
  };

  client.post = invalidateAndRun(client.post.bind(client));
  client.put = invalidateAndRun(client.put.bind(client));
  client.patch = invalidateAndRun(client.patch.bind(client));
  client.delete = invalidateAndRun(client.delete.bind(client));

  return client;
}

export type SquadMember = {
  id: string;
  role: "admin" | "member";
  nickname?: string | null;
  joinedAt: string;
  user: { id: string; username: string; email: string };
};

export type Squad = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdAt: string;
  members: SquadMember[];
};

