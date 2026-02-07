import Link from "next/link";
import { getRequestClient } from "@/lib/safe-client";

export const dynamic = "force-dynamic";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function SafePage({
  searchParams,
}: {
  searchParams: Promise<{ delay?: string }>;
}) {
  const params = await searchParams;
  const delayMs = parseInt(params.delay || "1000", 10);
  const reqId = crypto.randomUUID().slice(0, 8);

  const client1 = getRequestClient();
  console.log(`[safe:rsc]   req=${reqId} WRITE  cache()=${client1.requestId.slice(0, 8)} (delay ${delayMs}ms)`);

  await delay(delayMs);

  const client2 = getRequestClient();
  const match = client1.requestId === client2.requestId;
  console.log(
    `[safe:rsc]   req=${reqId} READ   cache()=${client2.requestId.slice(0, 8)} → ${
      match ? "✓ same" : `✗ MISMATCH (wrote ${client1.requestId.slice(0, 8)}, got ${client2.requestId.slice(0, 8)})`
    }`
  );

  const result = {
    route: "safe",
    pattern: "React.cache()",
    call1RequestId: client1.requestId,
    call2RequestId: client2.requestId,
    match,
    delayMs,
    timestamp: Date.now(),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-mono text-xs text-muted hover:text-foreground transition-colors">
            ← Back
          </Link>
          <span className="text-border">|</span>
          <div className="w-1.5 h-1.5 rounded-full bg-safe" />
          <span className="font-mono text-sm text-safe tracking-wider uppercase">
            Safe Route
          </span>
        </div>
        <span className="font-mono text-xs text-muted">React.cache()</span>
      </header>

      <main className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            <code className="font-mono text-safe">React.cache()</code> Isolation
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Both calls return the same <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded border border-border">requestId</code> within
            a single request, but produce different IDs across separate requests.
          </p>
        </div>

        <div className="border border-border rounded-lg overflow-hidden mb-6">
          <div className="bg-surface-2 px-4 py-2 border-b border-border flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-safe animate-[pulse-safe_2s_ease-in-out_infinite]" />
            <span className="font-mono text-xs text-muted">response</span>
          </div>
          <pre className="bg-surface p-5 text-sm leading-relaxed overflow-x-auto font-mono">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>

        <div
          className={`border rounded-lg px-4 py-3 font-mono text-sm ${
            match
              ? "border-safe-border bg-safe-glow text-safe"
              : "border-danger-border bg-danger-glow text-danger"
          }`}
        >
          {match
            ? "✓ IDs match — correct, same request scope"
            : "✗ IDs don't match — unexpected behavior"}
        </div>
      </main>
    </div>
  );
}
