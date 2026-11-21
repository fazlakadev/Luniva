import { baileysManager, BaileysStreamEvent } from "@/lib/whatsapp-baileys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connection status
      const initialStatus = baileysManager.getStatus();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "status_update", data: initialStatus })}\n\n`),
      );

      // 2. Subscribe to new messages & updates
      const subscriber = (event: BaileysStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // stream might be closed
        }
      };

      baileysManager.subscribe(subscriber);

      // 3. Heartbeat ping to prevent proxy timeouts
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      // 4. Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        baileysManager.unsubscribe(subscriber);
        clearInterval(pingInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
