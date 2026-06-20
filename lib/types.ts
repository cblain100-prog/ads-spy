export interface Shop {
  id: number;
  name: string;
  created_at: string;
}

export interface Competitor {
  id: number;
  shop_id: number;
  name: string;
  facebook_page_id: string;
  active: boolean;
  note?: string | null;
}

export interface Ad {
  id: number;
  shop_id: number;
  competitor: string;
  ad_id: string;
  ad_url: string;
  spend_estime_eur: number;
  spend_jour_eur: number;
  prev_spend_jour_eur: number | null;
  jours_diffusion: number;
  reach: number | null;
  suivi: boolean;
  first_seen: string | null;
  updated_at: string;
}
