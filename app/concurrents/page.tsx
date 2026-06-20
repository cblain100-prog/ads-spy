import { Nav } from "@/components/Nav";
import * as db from "@/lib/db";
import { addCompetitorAction, toggleCompetitorAction, deleteCompetitorAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function Concurrents({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const sp = await searchParams;
  const shops = await db.listShops();
  const shopId = Number(sp.shop) || (shops[0]?.id ?? 1);
  const [shop, competitors] = await Promise.all([db.getShop(shopId), db.listCompetitors(shopId)]);

  return (
    <>
      <Nav shopId={shopId} active="concurrents" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Concurrents</h1>
        <p className="mt-1 text-sm text-slate-500">
          {shop?.name ?? "Boutique"} · les concurrents actifs sont ceux que la routine va scanner.
        </p>

        <form action={addCompetitorAction} className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="shop_id" value={shopId} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500">Nom</span>
            <input name="name" required placeholder="Ex : Meller" className="rounded-md border border-slate-300 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500">Facebook page ID</span>
            <input name="facebook_page_id" required placeholder="1415151682063242" className="rounded-md border border-slate-300 px-2 py-1" />
          </label>
          <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            Ajouter
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Nom</th>
                <th className="px-3 py-2 font-medium">Facebook page ID</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {competitors.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{c.facebook_page_id}</td>
                  <td className="px-3 py-2">
                    <span className={c.active ? "text-emerald-600" : "text-slate-400"}>
                      {c.active ? "actif" : "inactif"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <form action={toggleCompetitorAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={String(c.active)} />
                        <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                          {c.active ? "Désactiver" : "Activer"}
                        </button>
                      </form>
                      <form action={deleteCompetitorAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {competitors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                    Aucun concurrent. Ajoute-en un ci-dessus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
