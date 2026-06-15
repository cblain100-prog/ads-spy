import type { NextRequest } from "next/server";

/** Verifie le header Authorization: Bearer <ADS_SPY_TOKEN>. */
export function checkToken(req: NextRequest): boolean {
  const token = process.env.ADS_SPY_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] === token : false;
}
