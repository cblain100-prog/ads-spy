# Ads Spy — veille pubs Meta concurrents (app interne)

Dashboard interne qui affiche le **top 10 des pubs concurrentes** (toutes marques d'une boutique), classées par **spend estimé/jour**, avec un tag par pub : `CONFIRMÉ` / `SCALE` / `DÉPART`. Multi-boutiques.

Le scan est **intégré** : `POST /api/shops/<id>/scan` interroge directement l'**API officielle Meta Ad Library** (gratuite), estime le spend à partir du reach DSA, et upsert dans Supabase. Plus de TrendTrack (payant), ni de Google Sheet, ni de Telegram. Les routes `GET/POST .../ads` restent dispo pour pousser des données depuis un script externe si besoin.

> **Le spend n'est pas réel.** Meta n'expose pas le spend des pubs commerciales (seulement les politiques). On l'estime : `spend ≈ reach × FREQUENCY / 1000 × CPM_EUR` (défauts 2 et 9 €, calibrables via env). Proxy à 2-3× près, et **reach UE seulement** (transparence DSA) → aveugle sur les concurrents qui scalent hors-UE (US/UK). Parfait pour du DTC ciblant la France.

## Recréer une instance (clé en main, dans Claude Code)

Pour qu'un client ait **sa propre instance** indépendante :

1. Cloner ce repo et l'ouvrir dans **Claude Code** (avec les MCP **Supabase** + **Vercel** connectés, et la CLI `vercel` authentifiée).
2. Dire **« setup le projet »** (ou taper **`/setup-supabase`**). Claude fait tout, dans l'ordre : `npm install` → projet Supabase + schéma + seed → `.env.local` → déploiement Vercel + env vars → **token Meta** (`/setup-meta`) → cron quotidien → premier scan.
3. Seule étape vraiment manuelle, côté client : le **token Meta** — il faut **sa propre app Meta** + sa **confirmation d'identité** sur facebook.com/ID (obligatoire pour l'Ad Library API). Tout le flux, avec les pièges, est dans **`/setup-meta`**.

Le playbook complet pour l'agent est dans **[CLAUDE.md](CLAUDE.md)** (auto-chargé par Claude Code). Tant que Supabase n'est pas configuré, l'app tourne quand même et affiche une bannière de rappel (pas de crash). Schéma : `supabase/schema.sql`.

```bash
npm run dev      # http://localhost:3000
```

## Pages

- `/` — Dashboard : top 10 par spend/jour, filtres (concurrent, profil, suivies), toggle « Suivi ».
- `/concurrents` — ajouter / activer / supprimer les concurrents d'une boutique (= ce que la routine scanne).
- `/boutiques` — ajouter une boutique pour dupliquer la veille.

## Tags (profils)

| Tag | Règle (curseurs de départ, à calibrer) |
|-----|----------------------------------------|
| `CONFIRMÉ` | diffusée ≥ 21 j et toujours au top → winner prouvé |
| `SCALE` | spend/jour a ≥ doublé vs le dernier run |
| `DÉPART` | pub ≤ 7 j déjà au top |

Réglages dans `lib/profile.ts`. Le spend est un **proxy** (reach × CPM), pas le budget réel.

## Scan Meta (le cœur)

`POST /api/shops/<id>/scan` fait tout : lit les concurrents actifs → interroge Meta Ad Library pour chacun → estime le spend depuis le reach FR → calcule le spend/jour (incrémental vs run précédent) → upsert dans Supabase. À lancer 1-2×/jour (le reach DSA ne se rafraîchit qu'~1×/jour).

```bash
TOKEN=ton-token   # = ADS_SPY_TOKEN

# Lance un scan complet de la boutique 1 (renvoie un résumé par concurrent)
curl -s -X POST http://localhost:3000/api/shops/1/scan -H "Authorization: Bearer $TOKEN"
```

**Env requis** (`.env.local`) :

- `META_ACCESS_TOKEN` — token d'une app Meta (Graph API Explorer suffit pour démarrer ; le dataset DSA UE `ad_type=ALL` ne demande pas de vérif d'identité).
- `ADS_SPY_CPM_EUR` (défaut 9), `ADS_SPY_FREQUENCY` (défaut 2), `ADS_SPY_FLOOR_EUR` (défaut 5000) — calibration de l'estimation, optionnels.

**Cron** : sur Vercel, un cron (GET-only) peut taper la même route — la route accepte aussi `GET`. Ajoute le `Authorization: Bearer` via `CRON_SECRET = ADS_SPY_TOKEN`, ou déclenche le `POST` depuis un cron externe.

## API ads/competitors (push externe — optionnel)

Toutes les routes exigent `Authorization: Bearer $ADS_SPY_TOKEN`.

```bash
# Concurrents actifs d'une boutique
curl -s http://localhost:3000/api/shops/1/competitors -H "Authorization: Bearer $TOKEN"

# État actuel des pubs
curl -s http://localhost:3000/api/shops/1/ads -H "Authorization: Bearer $TOKEN"

# Pousser un lot de pubs (upsert sur (shop_id, ad_id)) — si on veut bypasser le scan intégré
curl -s -X POST http://localhost:3000/api/shops/1/ads \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ads":[{"competitor":"Meller","ad_id":"120218400111","spend_estime_eur":86000,"spend_jour_eur":2200,"jours_diffusion":42,"reach":9500000}]}'
```

Champs d'une pub (POST) : `competitor`, `ad_id` (string), `spend_estime_eur`, `spend_jour_eur`, `jours_diffusion`, `reach?`, `ad_url?`, `first_seen?`. Le `prev_spend_jour_eur` est calculé côté app à chaque upsert.

## Prochaines étapes

- Auth (mot de passe / Supabase Auth) sur le dashboard.
- Multi-pays (le reach est filtré sur `FR` dans `lib/meta.ts` — généraliser par boutique).

## Stack

Next.js 15 (App Router, TS) · Tailwind · Supabase (Postgres) · Meta Ad Library API.
