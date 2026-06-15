const nf = new Intl.NumberFormat("fr-FR");

export function eur(n: number): string {
  return `${nf.format(Math.round(n))} €`;
}

export function num(n: number): string {
  return nf.format(Math.round(n));
}

/** Reach quotidien approximatif derive du spend estime/jour (proxy reach x CPM). */
export function kReach(spendJourEur: number, cpm = 9): string {
  const reach = (spendJourEur / cpm) * 1000;
  return `${Math.round(reach / 1000)}k`;
}
