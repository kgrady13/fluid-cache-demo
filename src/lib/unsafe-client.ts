let client: { requestId: string; createdAt: number } | null = null;

export const getRequestClient = () => {
  if (!client) {
    client = { requestId: crypto.randomUUID(), createdAt: Date.now() };
  }
  return client;
};

export const resetClient = () => {
  client = null;
};
