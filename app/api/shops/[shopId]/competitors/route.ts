import { type NextRequest, NextResponse } from "next/server";
import { checkToken } from "@/lib/auth";
import * as db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  if (!checkToken(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { shopId } = await params;
  const competitors = (await db.listActiveCompetitors(Number(shopId))).map((c) => ({
    name: c.name,
    facebook_page_id: c.facebook_page_id,
    note: c.note ?? null,
  }));
  return NextResponse.json({ shop_id: Number(shopId), competitors });
}
