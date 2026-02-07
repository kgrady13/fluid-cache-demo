import { NextResponse } from "next/server";
import { getRequestClient, runWithClient } from "@/lib/als-client";

export const dynamic = "force-dynamic";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const delayMs = parseInt(url.searchParams.get("delay") || "1000", 10);

  const reqId = crypto.randomUUID().slice(0, 8);

  return runWithClient(async () => {
    const client1 = getRequestClient();
    console.log(`[safe]   req=${reqId} WRITE  scope=${client1.requestId.slice(0, 8)} (delay ${delayMs}ms)`);

    await delay(delayMs);

    const client2 = getRequestClient();
    const match = client1.requestId === client2.requestId;
    console.log(
      `[safe]   req=${reqId} READ   scope=${client2.requestId.slice(0, 8)} → ${
        match ? "✓ same" : `✗ MISMATCH (wrote ${client1.requestId.slice(0, 8)}, got ${client2.requestId.slice(0, 8)})`
      }`
    );

    return NextResponse.json({
      route: "safe",
      pattern: "AsyncLocalStorage",
      call1RequestId: client1.requestId,
      call2RequestId: client2.requestId,
      match,
      delayMs,
      timestamp: Date.now(),
    });
  });
}
