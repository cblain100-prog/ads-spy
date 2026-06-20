# Setup ads-spy

App de veille pubs concurrents (Meta Ad Library / TrendTrack), multi-boutiques, sur Supabase.

## En une phrase

Ouvre le projet dans Claude Code et dis-lui :

> **setup le projet** (ou tape `/setup-supabase`)

Claude fait tout : `npm install`, crée le projet Supabase, applique le schéma + les données de démo, écrit le `.env.local`, et lance l'app. Tu n'as rien à copier-coller à la main.

## Pré-requis (une seule fois)

- **Node 18+** installé.
- **MCP Supabase connecté** dans Claude Code (réglages → Connecteurs / MCP → Supabase, avec ton compte / access token). C'est ce qui permet à Claude de créer la base tout seul. Doc : https://supabase.com/docs/guides/getting-started/mcp

## Ce que Claude met en place

- Tables `shops`, `competitors`, `ads` (schéma dans `supabase/schema.sql`).
- Seed : la boutique **Marco Moretti** + 3 concurrents + ~56 pubs de démo, pour que le dashboard soit peuplé direct.
- `.env.local` rempli : `SUPABASE_URL`, `SUPABASE_KEY` (clé publishable), `ADS_SPY_TOKEN` (token de l'API).

## Démarrer / relancer ensuite

```bash
npm run dev      # http://localhost:3000
```

## Comment ça marche

- **Lecture** : le dashboard lit Supabase server-side (rien d'exposé au navigateur).
- **Écriture** : une routine pousse les pubs via `POST /api/shops/<id>/ads` avec l'en-tête `Authorization: Bearer $ADS_SPY_TOKEN`. Voir le README pour les endpoints.
- Tant que Supabase n'est pas configuré, l'app affiche une bannière de rappel et un dashboard vide (elle ne crashe pas).
