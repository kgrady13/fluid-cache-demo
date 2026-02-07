import { cache } from "react";

export const getRequestClient = cache(() => {
  return { requestId: crypto.randomUUID(), createdAt: Date.now() };
});
