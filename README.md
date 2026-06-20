# Ads Spy — veille pubs Meta concurrents (app interne)

Dashboard interne qui affiche le **top 10 des pubs concurrentes** (toutes marques d'une boutique), classées par **spend estimé/jour**, avec un tag par pub : `CONFIRMÉ` / `SCALE` / `DÉPART`. Multi-boutiques.

L'app **ne scanne rien** elle-même : une routine Claude (skill `marco-moretti-ads-spy`) lui pousse les données via l'API. L'app stocke et affiche.

## Setup (Supabase)

L'app tourne sur **Supabase** (Postgres). Le plus simple, dans Claude Code :

> dis **setup le projet** (ou tape `/setup-supabase`)

Claude crée le projet Supabase, applique le schéma + le seed (boutique « Marco Moretti » + 3 concurrents + ~56 pubs démo), écrit le `.env.local` et lance l'app. Détails et pré-requis (MCP Supabase) : **[SETUP.md](SETUP.md)**.

Ensuite :

```bash
npm run dev      # http://localhost:3000
```

Tant que Supabase n'est pas configuré, l'app affiche une bannière de rappel + un dashboard vide (pas de crash). Schéma : `supabase/schema.sql`.

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

## API (pour la routine)

Toutes les routes exigent l'en-tête `Authorization: Bearer $ADS_SPY_TOKEN` (défini dans `.env.local`).

```bash
TOKEN=ton-token   # = la valeur de ADS_SPY_TOKEN dans ton .env.local

# 1. La routine récupère les concurrents actifs à scanner
curl -s http://localhost:3000/api/shops/1/competitors -H "Authorization: Bearer $TOKEN"

# 2. La routine relit l'état actuel (pour calculer l'accélération)
curl -s http://localhost:3000/api/shops/1/ads -H "Authorization: Bearer $TOKEN"

# 3. La routine pousse un lot de pubs (upsert sur (shop_id, ad_id))
curl -s -X POST http://localhost:3000/api/shops/1/ads \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ads":[{"competitor":"Meller","ad_id":"120218400111","spend_estime_eur":86000,"spend_jour_eur":2200,"jours_diffusion":42,"reach":9500000}]}'
```

Champs d'une pub (POST) : `competitor`, `ad_id` (string), `spend_estime_eur`, `spend_jour_eur`, `jours_diffusion`, `reach?`, `ad_url?`, `first_seen?`. Le `prev_spend_jour_eur` est calculé côté app à chaque upsert.

## Prochaines étapes (pas dans cette V1)

- Brancher le skill `marco-moretti-ads-spy` sur ces 3 endpoints (au lieu du Google Sheet) + couper le Telegram.
- Remplacer le store JSON (`lib/db.ts`) par **Supabase** (via le MCP) — la couche data est isolée, l'app ne change pas.
- Auth (mot de passe / Supabase Auth) + déploiement **Vercel**.

## Stack

Next.js 15 (App Router, TS) · Tailwind · store JSON local (`data/db.json`).
