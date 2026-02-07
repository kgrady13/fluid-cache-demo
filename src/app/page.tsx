import Link from "next/link";
import { Simulation } from "@/components/simulation";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header bar */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-safe animate-[pulse-safe_2s_ease-in-out_infinite]" />
          <span className="font-mono text-sm text-muted tracking-wider uppercase">
            Fluid Compute
          </span>
        </div>
        <span className="font-mono text-xs text-muted">
          Cache Isolation Demo
        </span>
      </header>

      <main className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
        {/* Hero */}
        <div className="animate-fade-up mb-16">
          <p className="font-mono text-xs text-muted tracking-widest uppercase mb-4">
            Vercel Fluid Compute
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            Does <code className="font-mono text-safe">cache()</code> actually
            <br />
            isolate your requests?
          </h1>
          <p className="text-muted max-w-xl text-lg leading-relaxed">
            A live test comparing <code className="font-mono text-sm bg-surface-2 px-1.5 py-0.5 rounded border border-border">React.cache()</code> per-request
            isolation against a naive module-scoped singleton under concurrent
            Fluid Compute execution.
          </p>
        </div>

        {/* Static architecture comparison */}
        <div className="animate-fade-up mb-16" style={{ animationDelay: "0.1s" }}>
          <div className="grid md:grid-cols-2 gap-px bg-border rounded-lg overflow-hidden">
            {/* Safe side */}
            <div className="bg-surface p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-safe" />
                <span className="font-mono text-xs text-safe tracking-wider uppercase">
                  Isolated
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="border border-safe-border bg-safe-glow rounded px-3 py-2">
                  <p className="font-mono text-xs text-muted mb-1">Request A</p>
                  <p className="font-mono text-sm text-safe">cache() → uuid-aaa</p>
                </div>
                <div className="border border-safe-border bg-safe-glow rounded px-3 py-2">
                  <p className="font-mono text-xs text-muted mb-1">Request B</p>
                  <p className="font-mono text-sm text-safe">cache() → uuid-bbb</p>
                </div>
              </div>

              <p className="text-sm text-muted leading-relaxed mb-5">
                <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded border border-border">React.cache()</code> gives each request its own memoization scope.
                Two calls within one request return the same value — but
                never leak across concurrent requests.
              </p>

              <Link
                href="/safe"
                className="inline-flex items-center gap-1.5 font-mono text-xs border border-safe-border text-safe px-3 py-1.5 rounded hover:bg-safe-glow transition-colors"
              >
                <span>Try it</span>
                <span className="text-muted">→</span>
              </Link>
            </div>

            {/* Unsafe side */}
            <div className="bg-surface p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                <span className="font-mono text-xs text-danger tracking-wider uppercase">
                  Leaking
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="border border-danger-border bg-danger-glow rounded px-3 py-2">
                  <p className="font-mono text-xs text-muted mb-1">Request A</p>
                  <p className="font-mono text-sm text-danger">singleton → uuid-aaa</p>
                </div>
                <div className="border border-danger-border bg-danger-glow rounded px-3 py-2">
                  <p className="font-mono text-xs text-muted mb-1">Request B</p>
                  <p className="font-mono text-sm text-amber">singleton → uuid-aaa ⚠</p>
                </div>
              </div>

              <p className="text-sm text-muted leading-relaxed mb-5">
                A <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded border border-border">let client</code> module-level variable persists across concurrent requests
                sharing the same function instance. Request B reads Request
                A&apos;s state — a cross-request data leak.
              </p>

              <Link
                href="/unsafe"
                className="inline-flex items-center gap-1.5 font-mono text-xs border border-danger-border text-danger px-3 py-1.5 rounded hover:bg-danger-glow transition-colors"
              >
                <span>Try it</span>
                <span className="text-muted">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Simulation accordion */}
        <div className="animate-fade-up mb-16" style={{ animationDelay: "0.15s" }}>
          <details className="group border border-border rounded-lg overflow-hidden">
            <summary className="px-5 py-3.5 bg-surface-2 cursor-pointer flex items-center justify-between select-none hover:bg-surface transition-colors list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5 text-muted transition-transform duration-200 group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-mono text-xs text-muted tracking-widest uppercase">
                  Watch it happen
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted">
                animated step-by-step
              </span>
            </summary>
            <Simulation />
          </details>
        </div>

        {/* How it works */}
        <div className="animate-fade-up mb-16" style={{ animationDelay: "0.2s" }}>
          <h2 className="font-mono text-xs text-muted tracking-widest uppercase mb-6">
            How the test works
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <Step
              n={1}
              title="Generate"
              description="Each request generates a unique ID via crypto.randomUUID() on first access."
            />
            <Step
              n={2}
              title="Delay"
              description="A configurable delay (default 1s) creates a window where concurrent requests overlap on the same instance."
            />
            <Step
              n={3}
              title="Verify"
              description="The same getter is called again. If the ID changed, another request overwrote it — a leak."
            />
          </div>
        </div>

        {/* Test runner */}
        <div className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="font-mono text-xs text-muted tracking-widest uppercase mb-4">
            Run the load test
          </h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-surface-2 px-4 py-2 border-b border-border flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-xs text-muted">terminal</span>
            </div>
            <pre className="bg-surface p-5 text-sm leading-relaxed overflow-x-auto">
              <code>
                <span className="text-muted"># Run against your Vercel deployment</span>{"\n"}
                <span className="text-safe">$</span>{" "}
                <span className="text-foreground">TEST_URL</span>
                <span className="text-muted">=</span>
                <span className="text-cyan">https://your-app.vercel.app</span>
                <span className="text-foreground"> npx tsx scripts/test-isolation.ts</span>
                {"\n\n"}
                <span className="text-muted"># Crank up concurrency + longer server delay</span>{"\n"}
                <span className="text-safe">$</span>{" "}
                <span className="text-foreground">MAX_RPS</span>
                <span className="text-muted">=</span>
                <span className="text-amber">50</span>{" "}
                <span className="text-foreground">DURATION</span>
                <span className="text-muted">=</span>
                <span className="text-amber">30</span>{" "}
                <span className="text-foreground">DELAY</span>
                <span className="text-muted">=</span>
                <span className="text-amber">2000</span>{" "}
                <span className="text-foreground">npx tsx scripts/test-isolation.ts</span>
              </code>
            </pre>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-xs text-muted">
          Built with Next.js 15 + Vercel Fluid Compute
        </span>
        <div className="flex items-center gap-4 font-mono text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-safe" />
            cache() = safe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            singleton = leak
          </span>
        </div>
      </footer>
    </div>
  );
}

function Step({
  n,
  title,
  description,
}: {
  n: number;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-xs text-muted bg-surface-2 w-6 h-6 rounded flex items-center justify-center border border-border">
          {n}
        </span>
        <span className="font-mono text-sm font-medium">{title}</span>
      </div>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}
