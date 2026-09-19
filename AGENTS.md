# ads-spy — manuel d'exploitation (pour Claude Code)

Veille des pubs Meta des concurrents (DTC). Dashboard Next.js + Supabase. Le scan
interroge l'**API officielle Meta Ad Library** (gratuite), estime le spend à partir
du reach DSA, et stocke dans Supabase. Pas de TrendTrack, pas de Google Sheet, pas
de Telegram.

## Setup d'une nouvelle instance (client)

Une seule commande fait tout : **`/setup-supabase`** (ou dis « setup le projet »).
Elle enchaîne : `npm install` → projet Supabase + schéma + seed → `.env.local` →
déploiement Vercel + env vars → **token Meta** (cf. `/setup-meta`) → cron quotidien →
premier scan. Pré-requis : MCP Supabase connecté + CLI/MCP Vercel.

## Architecture (ne pas se tromper)

- **L'app ne fait que stocker + afficher + scanner.** Tout l'état vit dans Supabase
  (tables `shops`, `competitors`, `ads`). Schéma : `supabase/schema.sql`.
- **Scan** : `lib/scan.ts` (`runScan`) — lit les concurrents actifs, appelle Meta
  (`lib/meta.ts`), estime le spend, calcule le spend/jour incrémental vs run précédent,
  upsert, puis purge les pubs sous le seuil. Exposé en `POST/GET /api/shops/<id>/scan`
  (auth `Authorization: Bearer ADS_SPY_TOKEN`). Aussi déclenché par le cron et par le
  bouton **Actualiser** du dashboard (server action).
- **Estimation du spend** (Meta ne donne PAS le spend commercial) :
  `spend ≈ reach × FREQUENCY / 1000 × CPM_EUR` (défauts 2.0 et 9 €, via env
  `ADS_SPY_FREQUENCY` / `ADS_SPY_CPM_EUR`). Reach = somme du breakdown FR (fallback
  `eu_total_reach`). **Reach UE seulement** (DSA) → aveugle hors-UE (US/UK).
- **Seuil** : `shops.floor_eur` (par boutique, éditable depuis le dashboard). Seules
  les pubs dont le spend estimé ≥ seuil sont suivies. Défaut 2000 €.

## Variables d'environnement

| var | rôle |
|---|---|
| `SUPABASE_URL`, `SUPABASE_KEY` | base (clé publishable/anon, server-side only) |
| `ADS_SPY_TOKEN` | protège les routes API (Bearer) |
| `META_ACCESS_TOKEN` | token Meta Ad Library (cf. `/setup-meta`) |
| `CRON_SECRET` | **= la valeur de `ADS_SPY_TOKEN`** ; Vercel l'envoie en Bearer au cron |
| `ADS_SPY_CPM_EUR` / `ADS_SPY_FREQUENCY` / `ADS_SPY_FLOOR_EUR` | calibration (optionnels) |

## Token Meta — LE point qui fait perdre du temps (lis avant de toucher)

L'Ad Library API a des pièges connus. Détail complet + commandes : **`/setup-meta`**.
Résumé :

1. **Confirmation d'identité OBLIGATOIRE.** Sans elle, l'API renvoie
   `code 10 / subcode 2332002` même avec un token valide. Se fait sur
   **facebook.com/ID** (pièce d'identité), PAS dans le dashboard dev ni l'Explorateur
   Graph. Valable aussi pour `ad_type=ALL` (dataset DSA UE). C'est la cause n°1 de blocage.
2. **Les tokens de l'Explorateur Graph sont courts (~1-2 h)** → inutilisables pour le cron.
3. **Token durable = échange 60 jours** : `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<token_court>`. L'`APP_ID` se lit via `debug_token` ; l'`APP_SECRET` doit être celui de **la même app** (sinon « Error validating client secret »).
4. **Jamais-expirer** = token *System User* (Business Settings), mais l'app doit d'abord
   être rattachée à un portefeuille business.

## Vérifier qu'un token marche (toujours faire ça avant de débugger)

```bash
curl -sG "https://graph.facebook.com/v21.0/ads_archive" \
  --data-urlencode "access_token=$META_ACCESS_TOKEN" \
  --data-urlencode "ad_type=ALL" --data-urlencode "ad_active_status=ACTIVE" \
  --data-urlencode 'ad_reached_countries=["FR"]' \
  --data-urlencode 'search_page_ids=["<page_id>"]' \
  --data-urlencode "fields=id,page_name,eu_total_reach" --data-urlencode "limit=2"
```
Réponse = créas → OK. `code 190` → token expiré. `subcode 2332002` → identité pas confirmée.

## Opérations courantes

- **Scan manuel** : bouton Actualiser, ou
  `curl -X POST <url>/api/shops/1/scan -H "Authorization: Bearer $ADS_SPY_TOKEN"`.
- **Concurrents** : page `/concurrents` (ajout/activation/suppression). `facebook_page_id`
  = l'ID de page Facebook du concurrent.
- **Seuil** : champ « Seuil spend mini » sur le dashboard (re-scanne à l'enregistrement).
- **Cron** : `vercel.json` (quotidien 06:00 UTC). Auth via `CRON_SECRET`.

## Réponses (FR), style direct, sans emoji.
