# Fluid Compute Cache Isolation Demo

Does `React.cache()` properly isolate per-request state when multiple requests share the same function instance under [Vercel Fluid Compute](https://vercel.com/docs/functions/fluid-compute)?

**Yes.** This demo proves it with a side-by-side comparison.

## The Question

When using a pattern like this in a Server Component:

```ts
import { cache } from "react";

export const getClient = cache(() => {
  return new ApolloClient({ /* ... */ });
});
```

Does `cache()` give each request its own client, even when Fluid Compute runs multiple requests concurrently on the same function instance?

## What This Demo Tests

Two Server Component pages, each using the same 3-step pattern:

1. **Generate** a unique ID via `crypto.randomUUID()` on first access
2. **Delay** (default 1s) to create a window where concurrent requests overlap
3. **Verify** by reading the same value again — if it changed, another request overwrote it

### `/safe` — React.cache()

```ts
// src/lib/safe-client.ts
import { cache } from "react";

export const getRequestClient = cache(() => {
  return { requestId: crypto.randomUUID(), createdAt: Date.now() };
});
```

Each request gets its own memoization scope. Two calls within the same request return the same value. Concurrent requests never see each other's state.

### `/unsafe` — Module Singleton

```ts
// src/lib/unsafe-client.ts
let client = null;

export const getRequestClient = () => {
  if (!client) {
    client = { requestId: crypto.randomUUID(), createdAt: Date.now() };
  }
  return client;
};
```

A module-scoped variable persists across concurrent requests on the same instance. Request B reads Request A's state — a cross-request data leak.

## Results

Under load with 20-30+ concurrent requests per Fluid Compute instance:

| Route | Pattern | Result |
|-------|---------|--------|
| `/safe` | `React.cache()` | **Isolated** — every request gets a unique ID |
| `/unsafe` | `let client` singleton | **Leaked** — ~50% of requests see another request's ID |

## Running the Load Test

```bash
# Against your Vercel deployment
TEST_URL=https://your-app.vercel.app npx tsx scripts/test-isolation.ts

# Higher concurrency + longer delay window
MAX_RPS=50 DURATION=30 DELAY=2000 npx tsx scripts/test-isolation.ts
```

The test script ramps up gradually (warm-up, ramp, sustain) to avoid triggering WAF mitigations while maximizing concurrent requests per instance.

You can also watch the isolation in real-time via Vercel Runtime Logs — each request logs a `WRITE` and `READ` with its request ID:

```
[safe:rsc]   req=a3f8 WRITE  cache()=a3f8 (delay 1000ms)
[safe:rsc]   req=7c2e WRITE  cache()=7c2e (delay 1000ms)
[safe:rsc]   req=a3f8 READ   cache()=a3f8 → ✓ same
[safe:rsc]   req=7c2e READ   cache()=7c2e → ✓ same

[unsafe:rsc] req=b1d9 WRITE  singleton=b1d9 (delay 1000ms)
[unsafe:rsc] req=e4f2 WRITE  singleton=e4f2 (delay 1000ms)
[unsafe:rsc] req=b1d9 READ   singleton=e4f2 → ✗ LEAKED (wrote b1d9, got e4f2)
```

## TL;DR

If you wrap your client initialization with `React.cache()`, it is safe under Fluid Compute concurrency. Module-scoped singletons (`let client = null`) are not.
