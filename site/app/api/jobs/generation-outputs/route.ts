import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/music/kie-env";
import { processNextGenerationOutput } from "@/lib/music/generation-output-worker";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  try {
    const expected = requireCronSecret();
    const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!constantTimeEqual(provided, expected)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
    }

    const result = await processNextGenerationOutput();
    return NextResponse.json(result, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "worker_unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }
}

function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < rightBytes.length; index += 1) {
    difference |= rightBytes[index] ^ (leftBytes[index] ?? 0);
  }
  return difference === 0;
}
