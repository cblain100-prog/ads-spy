import * as db from "@/lib/db";
import type { AdInput } from "@/lib/db";
import { scanCompetitor } from "@/lib/meta";

export interface CompSummary {
  competitor: string;
  kept: number;
  error?: string;
}

export interface ScanResult {
  shop_id: number;
  upserted: number;
  summary: CompSummary[];
  error?: string;
}

// Scanne les concurrents actifs de la boutique via Meta Ad Library, estime le spend
// a partir du reach DSA, calcule le spend/jour incremental (vs run precedent) et
// upsert le tout dans Supabase. Pas de TrendTrack, pas de Google Sheet, pas de Telegram.
export async function runScan(shopId: number): Promise<ScanResult> {
  const competitors = await db.listActiveCompetitors(shopId);
  if (competitors.length === 0) {
    return { shop_id: shopId, error: "aucun concurrent actif", upserted: 0, summary: [] };
  }

  // Seuil de spend mini (€) reglable par boutique depuis le dashboard ; fallback env/2000.
  const shop = await db.getShop(shopId);
  const floorEur = shop?.floor_eur ?? Number(process.env.ADS_SPY_FLOOR_EUR ?? 2000);

  // Etat precedent : spend cumule + date du dernier run par ad -> spend/jour incremental.
  const prev = new Map<string, { spend: number; t: number }>();
  for (const a of await db.listAds(shopId)) {
    prev.set(String(a.ad_id), { spend: a.spend_estime_eur, t: new Date(a.updated_at).getTime() });
  }

  const now = Date.now();
  const rows: AdInput[] = [];
  const summary: CompSummary[] = [];

  for (const comp of competitors) {
    try {
      const scanned = await scanCompetitor(comp.name, comp.facebook_page_id, floorEur);
      for (const ad of scanned) {
        const p = prev.get(ad.ad_id);
        let spendJour: number;
        if (p) {
          // increment de spend depuis le dernier run, ramene au /jour
          const delta = Math.max(0, ad.spend_estime_eur - p.spend);
          const hours = Math.max(1, (now - p.t) / 3_600_000);
          spendJour = Math.round((delta / hours) * 24);
        } else {
          // pub jamais vue : moyenne sur sa duree de diffusion
          spendJour = Math.round(ad.spend_estime_eur / Math.max(ad.jours_diffusion, 1));
        }
        rows.push({
          competitor: ad.competitor,
          ad_id: ad.ad_id,
          ad_url: ad.ad_url,
          spend_estime_eur: ad.spend_estime_eur,
          spend_jour_eur: spendJour,
          jours_diffusion: ad.jours_diffusion,
          reach: ad.reach,
          first_seen: ad.first_seen,
        });
      }
      summary.push({ competitor: comp.name, kept: scanned.length });
    } catch (e) {
      summary.push({ competitor: comp.name, kept: 0, error: e instanceof Error ? e.message : "erreur" });
    }
  }

  // upsertAds reporte tout seul prev_spend_jour_eur (= spend/jour du run precedent).
  const upserted = await db.upsertAds(shopId, rows);
  // Le seuil est autoritaire : on vire les pubs passees sous le seuil (ex. apres l'avoir remonte).
  await db.pruneAdsBelowFloor(shopId, floorEur);
  return { shop_id: shopId, upserted, summary };
}
