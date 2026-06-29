import { type NextRequest, NextResponse } from "next/server";
import { checkToken } from "@/lib/auth";
import { runScan } from "@/lib/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // la pagination Meta peut etre longue

export async function POST(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  if (!checkToken(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { shopId } = await params;
  return NextResponse.json(await runScan(Number(shopId)));
}

// GET = meme chose (pratique pour un cron Vercel, qui ne fait que des GET).
export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  if (!checkToken(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { shopId } = await params;
  return NextResponse.json(await runScan(Number(shopId)));
}
