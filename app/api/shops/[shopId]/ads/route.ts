import { type NextRequest, NextResponse } from "next/server";
import { checkToken } from "@/lib/auth";
import * as db from "@/lib/db";
import type { AdInput } from "@/lib/db";

export const dynamic = "force-dynamic";

// Etat actuel des pubs (la routine relit le spend precedent pour calculer l'acceleration).
export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  if (!checkToken(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { shopId } = await params;
  return NextResponse.json({ shop_id: Number(shopId), ads: db.listAds(Number(shopId)) });
}

// Upsert d'un lot de pubs envoye par la routine. Body: { ads: AdInput[] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  if (!checkToken(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { shopId } = await params;
  let body: { ads?: AdInput[] };
  try {
    body = (await req.json()) as { ads?: AdInput[] };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const rows = Array.isArray(body.ads) ? body.ads : [];
  const upserted = db.upsertAds(Number(shopId), rows);
  return NextResponse.json({ shop_id: Number(shopId), upserted });
}
