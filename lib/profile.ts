import type { Ad } from "./types";

export type ProfileTag = "CONFIRMÉ" | "SCALE" | "DÉPART" | "—";

export interface Profile {
  tag: ProfileTag;
  accel: number | null;
}

// Curseurs SCALE — calques sur le skill marco-moretti (a calibrer apres ~1 semaine).
// L'acceleration n'a pas le meme sens selon la taille de la pub : doubler depuis
// une petite base = bruit ; doubler quand on est deja gros = vrai signal.
const SCALE_FLOOR_JOUR_EUR = 300; // sous 300 €/j : trop petit, jamais SCALE
const SCALE_PETIT_CUMUL_EUR = 3000; // sous 3000 € cumule : jamais SCALE
const SCALE_GROS_CUMUL_EUR = 8000; // au-dessus : deja gros -> x2 suffit
const ACCEL_BANDE_BASSE = 4; // pub moyenne (3k-8k) : doit quadrupler
const ACCEL_BANDE_HAUTE = 2; // grosse pub (>8k) : x2 suffit
const NEUVE_MAX_JOURS = 7; // pub "neuve"
const CONFIRME_MIN_JOURS = 21; // pub "confirmee" (winner prouve)

/**
 * Tag d'une pub a partir de ses donnees brutes.
 * Priorite : SCALE (accelere, par palier de taille) > DEPART (neuve) > CONFIRME (longevite).
 */
export function computeProfile(ad: Ad): Profile {
  const accel =
    ad.prev_spend_jour_eur && ad.prev_spend_jour_eur > 0
      ? ad.spend_jour_eur / ad.prev_spend_jour_eur
      : null;

  // SCALE seulement si la pub est assez grosse pour que l'acceleration compte.
  if (
    accel !== null &&
    ad.spend_jour_eur >= SCALE_FLOOR_JOUR_EUR &&
    ad.spend_estime_eur >= SCALE_PETIT_CUMUL_EUR
  ) {
    const seuil = ad.spend_estime_eur >= SCALE_GROS_CUMUL_EUR ? ACCEL_BANDE_HAUTE : ACCEL_BANDE_BASSE;
    if (accel >= seuil) {
      return { tag: "SCALE", accel };
    }
  }
  if (ad.jours_diffusion <= NEUVE_MAX_JOURS) {
    return { tag: "DÉPART", accel };
  }
  if (ad.jours_diffusion >= CONFIRME_MIN_JOURS) {
    return { tag: "CONFIRMÉ", accel };
  }
  return { tag: "—", accel };
}

/**
 * Score de scale pour le classement : l'acceleration brute, mais seulement si la pub
 * est assez grosse pour que ca compte (sinon null -> reste en bas du classement).
 */
export function scaleScore(ad: Ad): number | null {
  if (!ad.prev_spend_jour_eur || ad.prev_spend_jour_eur <= 0) return null;
  if (ad.spend_jour_eur < SCALE_FLOOR_JOUR_EUR || ad.spend_estime_eur < SCALE_PETIT_CUMUL_EUR) return null;
  return ad.spend_jour_eur / ad.prev_spend_jour_eur;
}
