import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ProfileBadge } from "@/components/Badge";
import { toggleSuiviAction, refreshAction } from "./actions";
import * as db from "@/lib/db";
import { isConfigured } from "@/lib/db";
import { computeProfile, scaleScore, type ProfileTag } from "@/lib/profile";
import { eur } from "@/lib/format";

export const dynamic = "force-dynamic";

const LIMIT = 50;

type SP = { [k: string]: string | string[] | undefined };
type SortKey = "scale" | "spend";

function majLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function qp(o: { shop: number; competitor?: string; profile?: string; suivi?: boolean; sort?: SortKey }): string {
  const p = new URLSearchParams();
  p.set("shop", String(o.shop));
  if (o.competitor) p.set("competitor", o.competitor);
  if (o.profile) p.set("profile", o.profile);
  if (o.suivi) p.set("suivi", "1");
  if (o.sort) p.set("sort", o.sort);
  return `/?${p.toString()}`;
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        active ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-semibold tabular-nums text-slate-800">{value}</div>
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const configured = isConfigured();
  const shops = await db.listShops();
  const shopId = Number(sp.shop) || (shops[0]?.id ?? 1);
  const [shop, competitors, adsRaw, maj] = await Promise.all([
    db.getShop(shopId),
    db.listCompetitors(shopId),
    db.listAds(shopId),
    db.lastUpdated(shopId),
  ]);

  const fCompetitor = typeof sp.competitor === "string" ? sp.competitor : "";
  const fProfile = typeof sp.profile === "string" ? sp.profile : "";
  const fSuivi = sp.suivi === "1";
  const fSort: SortKey = sp.sort === "scale" ? "scale" : "spend";

  const all = adsRaw.map((ad) => ({ ad, profile: computeProfile(ad), scale: scaleScore(ad) }));

  let rows = all;
  if (fCompetitor) rows = rows.filter((r) => r.ad.competitor === fCompetitor);
  if (fProfile) rows = rows.filter((r) => r.profile.tag === fProfile);
  if (fSuivi) rows = rows.filter((r) => r.ad.suivi);
  rows = [...rows].sort((a, b) => {
    if (fSort === "scale") {
      const d = (b.scale ?? -1) - (a.scale ?? -1);
      if (d !== 0) return d;
    }
    return b.ad.spend_jour_eur - a.ad.spend_jour_eur;
  });
  const top = rows.slice(0, LIMIT);

  const counts: Record<ProfileTag, number> = { "CONFIRMÉ": 0, "SCALE": 0, "DÉPART": 0, "—": 0 };
  all.forEach((r) => { counts[r.profile.tag] += 1; });
  const suiviesCount = all.filter((r) => r.ad.suivi).length;

  const profileOptions: ProfileTag[] = ["CONFIRMÉ", "SCALE", "DÉPART"];

  return (
    <>
      <Nav shopId={shopId} active="dashboard" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {!configured && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ Supabase n&apos;est pas connecté. Dis à Claude Code <span className="font-mono font-medium">setup le projet</span> (ou lance <span className="font-mono font-medium">/setup-supabase</span>) pour créer la base et charger les données.
          </div>
        )}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Top 50 — pubs concurrentes</h1>
            <p className="mt-1 text-sm text-slate-500">
              {shop?.name ?? "Boutique"} · {fSort === "scale" ? "classees par scale (×)" : "classees par spend/jour"} · 50 affichees (la routine scrape tout)
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Kpi label="Pubs" value={String(all.length)} />
            <Kpi label="Suivies" value={String(suiviesCount)} />
            <Kpi label="Scale" value={String(counts["SCALE"])} />
            <Kpi label="MAJ" value={majLabel(maj)} />
            <form action={refreshAction}>
              <input type="hidden" name="shop_id" value={shopId} />
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500"
                title="Relance le scan Meta (peut prendre ~30-60 s)"
              >
                Actualiser
              </button>
            </form>
          </div>
        </div>

        {/* Tri */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400">Trier par :</span>
          <Chip href={qp({ shop: shopId, competitor: fCompetitor, profile: fProfile, suivi: fSuivi, sort: "scale" })} active={fSort === "scale"} label="Scale (×)" />
          <Chip href={qp({ shop: shopId, competitor: fCompetitor, profile: fProfile, suivi: fSuivi, sort: "spend" })} active={fSort === "spend"} label="Spend/jour" />
        </div>

        {/* Filtre profil en 1 clic */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400">Profil :</span>
          <Chip href={qp({ shop: shopId, competitor: fCompetitor, suivi: fSuivi, sort: fSort })} active={!fProfile} label="Tous" />
          {profileOptions.map((p) => (
            <Chip
              key={p}
              href={qp({ shop: shopId, competitor: fCompetitor, profile: p, suivi: fSuivi, sort: fSort })}
              active={fProfile === p}
              label={p}
            />
          ))}
        </div>

        {/* Filtres concurrent + suivies */}
        <form method="get" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <input type="hidden" name="shop" value={shopId} />
          <input type="hidden" name="profile" value={fProfile} />
          <input type="hidden" name="sort" value={fSort} />
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Concurrent</span>
            <select name="competitor" defaultValue={fCompetitor} className="rounded-md border border-slate-300 px-2 py-1">
              <option value="">Tous</option>
              {competitors.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="suivi" value="1" defaultChecked={fSuivi} className="h-4 w-4" />
            <span className="text-slate-600">Suivies uniquement</span>
          </label>
          <button type="submit" className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white hover:bg-slate-700">
            Filtrer
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Concurrent</th>
                <th className="px-3 py-2 text-right font-medium">Scale</th>
                <th className="px-3 py-2 text-right font-medium">€/jour</th>
                <th className="px-3 py-2 text-right font-medium">Cumulé</th>
                <th className="px-3 py-2 text-right font-medium">Diffusion</th>
                <th className="px-3 py-2 font-medium">Profil</th>
                <th className="px-3 py-2 font-medium">Créa</th>
                <th className="px-3 py-2 font-medium">Suivi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top.map((r, i) => (
                <tr key={r.ad.ad_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{r.ad.competitor}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${r.scale && r.scale >= 4 ? "text-amber-600" : "text-slate-700"}`}>
                    {r.scale != null ? `×${r.scale.toFixed(1)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{eur(r.ad.spend_jour_eur)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{eur(r.ad.spend_estime_eur)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{r.ad.jours_diffusion} j</td>
                  <td className="px-3 py-2"><ProfileBadge tag={r.profile.tag} accel={r.profile.accel} /></td>
                  <td className="px-3 py-2">
                    <a href={r.ad.ad_url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
                      Voir →
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <form action={toggleSuiviAction}>
                      <input type="hidden" name="shop_id" value={shopId} />
                      <input type="hidden" name="ad_id" value={r.ad.ad_id} />
                      <button
                        type="submit"
                        className={`rounded-md px-2 py-1 text-xs font-medium ${
                          r.ad.suivi
                            ? "bg-slate-900 text-white hover:bg-slate-700"
                            : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {r.ad.suivi ? "Suivie ✓" : "Suivre"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {top.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    Aucune pub pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Scale = accélération du spend/jour (×N) vs le dernier scan, calculée seulement sur les pubs assez grosses.
          Spend estimé = proxy (reach × CPM), pas le budget réel. CONFIRMÉ = ≥21j au top · SCALE = accélère franchement · DÉPART = pub ≤7j déjà au top.
        </p>
      </main>
    </>
  );
}
