import type { ProfileTag } from "@/lib/profile";

const styles: Record<ProfileTag, string> = {
  "CONFIRMÉ": "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  "SCALE": "bg-amber-100 text-amber-800 ring-amber-600/20",
  "DÉPART": "bg-sky-100 text-sky-700 ring-sky-600/20",
  "—": "bg-slate-100 text-slate-400 ring-slate-400/20",
};

export function ProfileBadge({ tag, accel }: { tag: ProfileTag; accel?: number | null }) {
  const label = tag === "SCALE" && accel ? `SCALE ×${accel.toFixed(1)}` : tag;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[tag]}`}
    >
      {label}
    </span>
  );
}
