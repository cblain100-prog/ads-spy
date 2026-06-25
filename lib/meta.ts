// Meta Ad Library API — scan des pubs actives d'un concurrent + estimation du spend.
//
// Meta n'expose PAS le spend des pubs commerciales (seulement les pubs politiques).
// On l'ESTIME donc a partir du reach expose par la transparence DSA (UE) :
//   spend_estime_eur = reach × FREQUENCY / 1000 × CPM_EUR
// Proxy a 2-3x pres, pas un budget reel — suffisant pour la veille. Calibrer
// CPM_EUR / FREQUENCY (env ADS_SPY_CPM_EUR / ADS_SPY_FREQUENCY) sur les vraies
// campagnes. Limite DSA : le reach n'existe que pour l'UE (aveugle sur US/UK).

const META_BASE = "https://graph.facebook.com/v21.0";

export const MARKET_COUNTRY = "FR"; // marche cible : reach de ce pays pour l'estimation
export const CPM_EUR = Number(process.env.ADS_SPY_CPM_EUR ?? 9); // CPM FR e-commerce (6-12)
export const FREQUENCY = Number(process.env.ADS_SPY_FREQUENCY ?? 2); // frequence moyenne (1.5-2.5)
export const TRACKING_FLOOR_EUR = Number(process.env.ADS_SPY_FLOOR_EUR ?? 5000); // on ne garde que les grosses
const MAX_PAGES = 40; // garde-fou pagination (40×100 = 4000 ads max / marque)
const MAX_PER_COMPETITOR = 100; // borne les ecritures Supabase

const FIELDS = [
  "id",
  "ad_creation_time",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "page_id",
  "page_name",
  "eu_total_reach",
  "age_country_gender_reach_breakdown",
  "ad_snapshot_url",
  "publisher_platforms",
].join(",");

interface MetaAd {
  id: string;
  ad_delivery_start_time?: string;
  eu_total_reach?: number | string;
  age_country_gender_reach_breakdown?: Array<{
    country?: string;
    age_gender_breakdowns?: Array<{ male?: number; female?: number; unknown?: number }>;
  }>;
}

export interface ScannedAd {
  competitor: string;
  ad_id: string;
  ad_url: string;
  spend_estime_eur: number;
  reach: number;
  jours_diffusion: number;
  first_seen: string | null;
}

function token(): string {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error("META_ACCESS_TOKEN manquant (voir .env.local)");
  return t;
}

// Toutes les ads ACTIVE d'une page ayant touche MARKET_COUNTRY (paginees).
async function fetchActiveAds(pageId: string): Promise<MetaAd[]> {
  const params = new URLSearchParams({
    access_token: token(),
    ad_type: "ALL", // pubs commerciales (pas que politiques) — requis pour le dataset DSA
    ad_active_status: "ACTIVE",
    ad_reached_countries: JSON.stringify([MARKET_COUNTRY]),
    search_page_ids: JSON.stringify([String(pageId)]),
    fields: FIELDS,
    limit: "100",
  });
  let url: string | null = `${META_BASE}/ads_archive?${params.toString()}`;
  const out: MetaAd[] = [];
  let pages = 0;
  while (url && pages < MAX_PAGES) {
    const res = await fetch(url);
    const json = (await res.json()) as {
      data?: MetaAd[];
      paging?: { next?: string };
      error?: { message?: string; type?: string };
    };
    if (json.error) throw new Error(`Meta API: ${json.error.message ?? json.error.type ?? "erreur inconnue"}`);
    if (Array.isArray(json.data)) out.push(...json.data);
    url = json.paging?.next ?? null; // next contient deja tous les params
    pages++;
  }
  return out;
}

// Reach sur MARKET_COUNTRY via le breakdown DSA ; fallback eu_total_reach.
export function marketReach(ad: MetaAd): number {
  let total = 0;
  let seen = false;
  for (const entry of ad.age_country_gender_reach_breakdown ?? []) {
    if (entry.country !== MARKET_COUNTRY) continue;
    seen = true;
    for (const ag of entry.age_gender_breakdowns ?? []) {
      for (const k of ["male", "female", "unknown"] as const) {
        const v = ag[k];
        if (typeof v === "number") total += v;
      }
    }
  }
  if (seen && total > 0) return total;
  const eu = Number(ad.eu_total_reach ?? 0);
  return Number.isFinite(eu) ? eu : 0;
}

export function estimateSpend(reach: number): number {
  return Math.round(((reach * FREQUENCY) / 1000) * CPM_EUR);
}

function daysRunning(start?: string): number {
  if (!start) return 0;
  const d = new Date(start);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

// Scan complet d'un concurrent : renvoie les pubs gardees (>= TRACKING_FLOOR_EUR),
// triees par reach desc. Le spend/jour n'est PAS calcule ici (il depend de l'etat
// precedent, fait cote route).
export async function scanCompetitor(name: string, pageId: string): Promise<ScannedAd[]> {
  const raw = await fetchActiveAds(pageId);
  const ads: ScannedAd[] = [];
  for (const ad of raw) {
    const reach = marketReach(ad);
    const spend = estimateSpend(reach);
    if (spend < TRACKING_FLOOR_EUR) continue;
    const start = ad.ad_delivery_start_time ?? "";
    ads.push({
      competitor: name,
      ad_id: String(ad.id),
      ad_url: `https://www.facebook.com/ads/library/?id=${ad.id}`,
      spend_estime_eur: spend,
      reach,
      jours_diffusion: daysRunning(start),
      first_seen: start ? start.slice(0, 10) : null,
    });
  }
  ads.sort((a, b) => b.reach - a.reach);
  return ads.slice(0, MAX_PER_COMPETITOR);
}
