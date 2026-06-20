import Link from "next/link";
import { Nav } from "@/components/Nav";
import * as db from "@/lib/db";
import { addShopAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function Boutiques() {
  const shops = await db.listShops();
  const current = shops[0]?.id ?? 1;
  const rows = await Promise.all(
    shops.map(async (s) => ({
      shop: s,
      nbCompetitors: (await db.listCompetitors(s.id)).length,
      nbSuivies: (await db.listAds(s.id)).filter((a) => a.suivi).length,
    })),
  );

  return (
    <>
      <Nav shopId={current} active="boutiques" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Boutiques</h1>
        <p className="mt-1 text-sm text-slate-500">
          Une boutique = une veille indépendante (ses concurrents, ses pubs). Ajoute une boutique pour dupliquer la veille.
        </p>

        <form action={addShopAction} className="mt-6 flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500">Nom de la boutique</span>
            <input name="name" required placeholder="Ex : Marco Moretti" className="rounded-md border border-slate-300 px-2 py-1" />
          </label>
          <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            Ajouter
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Boutique</th>
                <th className="px-3 py-2 font-medium">Concurrents</th>
                <th className="px-3 py-2 font-medium">Pubs suivies</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ shop: s, nbCompetitors, nbSuivies }) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                  <td className="px-3 py-2 text-slate-500">{nbCompetitors}</td>
                  <td className="px-3 py-2 text-slate-500">{nbSuivies}</td>
                  <td className="px-3 py-2">
                    <Link href={`/?shop=${s.id}`} className="text-sky-600 hover:underline">
                      Voir le dashboard →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
