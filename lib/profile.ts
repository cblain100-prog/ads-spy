import type { Ad } from "./types";

export type ProfileTag = "CONFIRMÉ" | "SCALE" | "DÉPART" | "—";

export interface Profile {
  tag: ProfileTag;
  accel: number | null;
}

// Curseurs de depart — a calibrer apres ~1 semaine de data reelle.
const SCALE_ACCEL_MIN = 2; // spend/jour qui double
const NEUVE_MAX_JOURS = 7; // pub "neuve"
const CONFIRME_MIN_JOURS = 21; // pub "confirmee" (winner prouve)

/**
 * Tag d'une pub a partir de ses donnees brutes.
 * Priorite : SCALE (accelere) > DEPART (neuve) > CONFIRME (longevite).
 */
export function computeProfile(ad: Ad): Profile {
  const accel =
    ad.prev_spend_jour_eur && ad.prev_spend_jour_eur > 0
      ? ad.spend_jour_eur / ad.prev_spend_jour_eur
      : null;

  if (accel !== null && accel >= SCALE_ACCEL_MIN) {
    return { tag: "SCALE", accel };
  }
  if (ad.jours_diffusion <= NEUVE_MAX_JOURS) {
    return { tag: "DÉPART", accel };
  }
  if (ad.jours_diffusion >= CONFIRME_MIN_JOURS) {
    return { tag: "CONFIRMÉ", accel };
  }
  return { tag: "—", accel };
}
