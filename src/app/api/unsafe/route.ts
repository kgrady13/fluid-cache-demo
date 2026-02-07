import { NextResponse } from "next/server";
import { getRequestClient, resetClient } from "@/lib/unsafe-client";

export const dynamic = "force-dynamic";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const delayMs = parseInt(url.searchParams.get("delay") || "1000", 10);
  const reqId = crypto.randomUUID().slice(0, 8);

  const client1 = getRequestClient();
  console.log(`[unsafe] req=${reqId} WRITE  singleton=${client1.requestId.slice(0, 8)} (delay ${delayMs}ms)`);

  await delay(delayMs);

  const client2 = getRequestClient();
  const match = client1.requestId === client2.requestId;
  console.log(
    `[unsafe] req=${reqId} READ   singleton=${client2.requestId.slice(0, 8)} → ${
      match ? "✓ same" : `✗ LEAKED (wrote ${client1.requestId.slice(0, 8)}, got ${client2.requestId.slice(0, 8)})`
    }`
  );

  const response = NextResponse.json({
    route: "unsafe",
    pattern: "module singleton",
    call1RequestId: client1.requestId,
    call2RequestId: client2.requestId,
    match,
    delayMs,
    timestamp: Date.now(),
  });

  // Reset AFTER building the response — the leak window is the delay period
  resetClient();

  return response;
}
