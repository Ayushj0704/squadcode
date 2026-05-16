import axios from "axios";

export function apiBaseUrl() {
  return (
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:8080"
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

  return client;
}

export type SquadMember = {
  id: string;
  role: "admin" | "member";
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

