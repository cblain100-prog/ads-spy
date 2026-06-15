import Link from "next/link";

export function Nav({ shopId, active }: { shopId: number; active: "dashboard" | "concurrents" | "boutiques" }) {
  const qs = `?shop=${shopId}`;
  const cls = (k: string) =>
    `hover:text-slate-900 ${active === k ? "text-slate-900 font-semibold" : "text-slate-500"}`;
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <span className="font-bold tracking-tight text-slate-900">Ads&nbsp;Spy</span>
        <nav className="flex gap-5 text-sm">
          <Link className={cls("dashboard")} href={`/${qs}`}>Dashboard</Link>
          <Link className={cls("concurrents")} href={`/concurrents${qs}`}>Concurrents</Link>
          <Link className={cls("boutiques")} href={`/boutiques`}>Boutiques</Link>
        </nav>
      </div>
    </header>
  );
}
