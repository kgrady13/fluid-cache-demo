/**
 * Isolation load test for Fluid Compute demo.
 *
 * Tests 2 Server Component endpoints:
 *   /safe          → React.cache() per-request isolation
 *   /unsafe        → module-scoped singleton (leaks under concurrency)
 *
 * Strategy for maximizing concurrency on a single Fluid instance:
 *  - Long server-side delay (default 1000ms) keeps requests in-flight longer
 *  - Continuous stream of requests (not batch-and-wait) ensures overlap
 *  - Gradual ramp avoids triggering WAF/DDoS mitigations
 *  - Staggered request starts within each second maximize overlap
 *
 * Usage:
 *   npx tsx scripts/test-isolation.ts                       # local, defaults
 *   TEST_URL=https://app.vercel.app npx tsx scripts/test-isolation.ts
 *   TEST_URL=https://app.vercel.app DURATION=30 MAX_RPS=50 DELAY=2000 npx tsx scripts/test-isolation.ts
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const DURATION_SECS = parseInt(process.env.DURATION || "20", 10);
const MAX_RPS = parseInt(process.env.MAX_RPS || "30", 10);
const DELAY_MS = parseInt(process.env.DELAY || "1000", 10);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestRecord {
  id: string;
  latencyMs: number;
  ok: boolean;
  error?: string;
}

interface PhaseReport {
  path: string;
  total: number;
  succeeded: number;
  failed: number;
  errorRate: string;
  unique: number;
  duplicates: number;
  leaked: boolean;
  duplicateIds: string[];
  latency: { p50: number; p95: number; p99: number; max: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/** Send a request to a Server Component page and extract call1RequestId from HTML */
async function sendPageRequest(url: string): Promise<RequestRecord> {
  const start = performance.now();
  try {
    const res = await fetch(url);
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      return { id: "", latencyMs, ok: false, error: `${res.status} ${res.statusText}` };
    }
    const html = await res.text();
    // Next.js HTML-encodes the JSON inside <pre> tags, so match the encoded form
    const preMatch = html.match(/call1RequestId(?:&quot;|"):\s*(?:&quot;|")([^"&]+)/);
    if (!preMatch) {
      return { id: "", latencyMs, ok: false, error: "could not parse call1RequestId from HTML" };
    }
    return { id: preMatch[1], latencyMs, ok: true };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return { id: "", latencyMs, ok: false, error: String(err) };
  }
}

function analyze(path: string, records: RequestRecord[]): PhaseReport {
  const succeeded = records.filter((r) => r.ok);
  const failed = records.filter((r) => !r.ok);

  const ids = succeeded.map((r) => r.id);
  const idCounts = new Map<string, number>();
  for (const id of ids) {
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }
  const duplicateIds = [...idCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  const uniqueIds = new Set(ids);
  const latencies = records.map((r) => r.latencyMs).sort((a, b) => a - b);

  return {
    path,
    total: records.length,
    succeeded: succeeded.length,
    failed: failed.length,
    errorRate: ((failed.length / records.length) * 100).toFixed(1) + "%",
    unique: uniqueIds.size,
    duplicates: ids.length - uniqueIds.size,
    leaked: uniqueIds.size < ids.length,
    duplicateIds,
    latency: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      max: latencies[latencies.length - 1] || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Continuous stream load generator
// ---------------------------------------------------------------------------

async function streamLoad(path: string): Promise<RequestRecord[]> {
  const url = `${BASE_URL}${path}?delay=${DELAY_MS}`;
  const records: RequestRecord[] = [];
  const inflight: Promise<void>[] = [];

  const warmDuration = Math.max(2, Math.round(DURATION_SECS * 0.2));
  const rampDuration = Math.max(2, Math.round(DURATION_SECS * 0.3));
  const sustainDuration = Math.max(2, DURATION_SECS - warmDuration - rampDuration);
  const warmRps = Math.max(1, Math.round(MAX_RPS * 0.25));

  const phases = [
    { name: "warm-up", durationSecs: warmDuration, startRps: warmRps, endRps: warmRps },
    { name: "ramp", durationSecs: rampDuration, startRps: warmRps, endRps: MAX_RPS },
    { name: "sustain", durationSecs: sustainDuration, startRps: MAX_RPS, endRps: MAX_RPS },
  ];

  for (const phase of phases) {
    const phaseStart = Date.now();
    const phaseEnd = phaseStart + phase.durationSecs * 1000;
    process.stdout.write(`    ${phase.name} (${phase.durationSecs}s, ${phase.startRps}-${phase.endRps} rps) `);

    while (Date.now() < phaseEnd) {
      const elapsed = (Date.now() - phaseStart) / 1000;
      const progress = Math.min(elapsed / phase.durationSecs, 1);
      const currentRps = Math.round(
        phase.startRps + (phase.endRps - phase.startRps) * progress
      );

      const intervalMs = 1000 / currentRps;
      const tickStart = Date.now();

      for (let i = 0; i < currentRps; i++) {
        const targetOffset = i * intervalMs;
        const actualOffset = Date.now() - tickStart;
        if (targetOffset > actualOffset) {
          await sleep(targetOffset - actualOffset);
        }

        const p = sendPageRequest(url).then((r) => {
          records.push(r);
        });
        inflight.push(p);
      }

      const tickElapsed = Date.now() - tickStart;
      const remaining = 1000 - tickElapsed;
      if (remaining > 0) await sleep(remaining);

      process.stdout.write(".");
    }
    process.stdout.write("\n");
  }

  process.stdout.write("    draining in-flight requests...");
  await Promise.all(inflight);
  process.stdout.write(" done\n");

  return records;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printReport(report: PhaseReport) {
  console.log(`  Requests:   ${report.succeeded}/${report.total} succeeded (${report.errorRate} errors)`);
  console.log(`  Latency:    p50=${report.latency.p50}ms  p95=${report.latency.p95}ms  p99=${report.latency.p99}ms  max=${report.latency.max}ms`);
  console.log(`  Unique IDs: ${report.unique} / ${report.succeeded}`);
  if (report.duplicates > 0) {
    const shown = report.duplicateIds.slice(0, 3);
    const extra = report.duplicateIds.length > 3 ? ` ...+${report.duplicateIds.length - 3} more` : "";
    console.log(`  Duplicates: ${report.duplicates} (${shown.join(", ")}${extra})`);
  }
}

async function main() {
  console.log(`\n=== Fluid Compute Isolation Load Test ===`);
  console.log(`Target:     ${BASE_URL}`);
  console.log(`Duration:   ${DURATION_SECS}s per endpoint`);
  console.log(`Max RPS:    ${MAX_RPS}`);
  console.log(`Delay:      ${DELAY_MS}ms (server-side per request)`);
  console.log(`In-flight:  ~${Math.round(MAX_RPS * DELAY_MS / 1000)} concurrent at peak`);

  console.log(`\n── React.cache() (isolated) ───────────────────\n`);

  console.log(`  /safe (React.cache)`);
  const safeRecords = await streamLoad("/safe");
  const safe = analyze("/safe", safeRecords);
  printReport(safe);

  console.log(`\n── Module Singleton (leaking) ─────────────────\n`);

  console.log(`  /unsafe (module singleton)`);
  const unsafeRecords = await streamLoad("/unsafe");
  const unsafe = analyze("/unsafe", unsafeRecords);
  printReport(unsafe);

  // --- Summary ---
  console.log(`\n── RESULTS ───────────────────────────────────\n`);
  console.log(`  /safe  (React.cache):    ${safe.leaked ? "❌ LEAKED" : "✅ ISOLATED"}`);
  console.log(
    `  /unsafe (singleton):     ${
      unsafe.leaked
        ? "❌ LEAKED (expected — " + unsafe.duplicates + " duplicate IDs)"
        : "⚠️  No leak detected (try higher MAX_RPS or longer DURATION)"
    }`
  );

  const anyFailed = [safe, unsafe].some((r) => r.failed > 0);
  if (anyFailed) {
    console.log(`\n⚠️  Some requests failed — check error rates above.`);
    console.log(`   If error rate is high, you may be hitting WAF/DDoS mitigations.`);
    console.log(`   See: https://vercel.com/docs/vercel-firewall/vercel-waf/system-bypass-rules`);
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
