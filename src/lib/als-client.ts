import { AsyncLocalStorage } from "node:async_hooks";

interface RequestClient {
  requestId: string;
  createdAt: number;
}

export const requestStorage = new AsyncLocalStorage<RequestClient>();

export function getRequestClient(): RequestClient {
  const existing = requestStorage.getStore();
  if (existing) return existing;
  // Fallback — should not happen when used inside runWithClient
  return { requestId: crypto.randomUUID(), createdAt: Date.now() };
}

export function runWithClient<T>(fn: () => T): T {
  const client: RequestClient = {
    requestId: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  return requestStorage.run(client, fn);
}
