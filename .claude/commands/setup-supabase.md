---
description: Setup complet du projet ads-spy (Supabase + env + lancement)
---

Tu vas configurer ce projet ads-spy de A à Z pour qu'il tourne sur Supabase. Fais TOUT toi-même, sans demander à l'utilisateur autre chose que les confirmations strictement nécessaires (ex : confirmer la création du projet Supabase). Procède dans l'ordre :

## 1. Dépendances
- Lance `npm install` à la racine du projet.

## 2. Projet Supabase (via le MCP Supabase)
Le MCP Supabase doit être connecté (réglages → Connecteurs/MCP). Si absent, dis à l'utilisateur de le connecter puis stoppe.
- `list_organizations` pour récupérer l'org. S'il y en a plusieurs, prends la première par défaut.
- Vérifie si un projet nommé `ads-spy` existe déjà (`list_projects`). Si oui, réutilise-le (ne recrée pas).
- Sinon `create_project` : name `ads-spy`, région `eu-west-3` (ou la région EU la plus proche). Confirme le coût si demandé.
- Attends que le projet soit `ACTIVE_HEALTHY` (re-check avec `get_project` si besoin).

## 3. Schéma + données
- Applique le contenu **intégral** du fichier `supabase/schema.sql` via `apply_migration` (name : `init_ads_spy`). Il crée les tables `shops`, `competitors`, `ads`, active la RLS avec policy permissive, et insère le seed (boutique Marco Moretti + 3 concurrents + ~56 pubs démo).
- Vérifie : `execute_sql` → `select count(*) from ads;` doit renvoyer 56.

## 4. Variables d'environnement
- `get_project_url` → l'URL du projet.
- `get_publishable_keys` (ou get_anon_key) → la clé publishable/anon.
- Génère un token API aléatoire fort (ex : 48 caractères hex).
- Écris le fichier `.env.local` à la racine avec EXACTEMENT :
  ```
  SUPABASE_URL=<url du projet>
  SUPABASE_KEY=<clé publishable>
  ADS_SPY_TOKEN=<token généré>
  ```
- Si le projet est aussi déployé sur Vercel, ajoute ces 3 variables aux env vars Vercel (sinon ignore).

## 5. Déploiement Vercel
- Lie/déploie le projet sur Vercel (CLI `vercel` authentifiée, ou MCP Vercel) : `vercel --prod --yes`.
- Ajoute les 3 variables (`SUPABASE_URL`, `SUPABASE_KEY`, `ADS_SPY_TOKEN`) aux env vars Vercel (production).
- Pour le cron : ajoute aussi `CRON_SECRET` avec **exactement la même valeur que `ADS_SPY_TOKEN`** (Vercel l'envoie en `Authorization: Bearer` au cron, que la route valide).

## 6. Token Meta Ad Library
- Lance le flux **`/setup-meta`** (token 60 jours). C'est l'étape la plus piégeuse — surtout la **confirmation d'identité obligatoire** sur facebook.com/ID, sinon l'API renvoie `subcode 2332002`. Le détail complet est dans cette commande.
- Une fois le token posé sur Vercel, redéploie.

## 7. Premier scan + vérif
- Le cron (`vercel.json`, quotidien 06:00 UTC) est déjà dans le repo : il se registre au déploiement.
- Lance un premier scan : `curl -X POST <url>/api/shops/1/scan -H "Authorization: Bearer <ADS_SPY_TOKEN>"`. Le résumé doit montrer des pubs gardées par concurrent.
- Le seed de démo (~56 pubs) est remplacé au fil des scans réels ; tu peux le purger : `delete from ads where shop_id=1 and updated_at = '2026-06-15T08:12:00.000Z';`.
- Confirme à l'utilisateur : dashboard live, données réelles, scan auto quotidien.

## Lancement local (option)
- `npm run dev` → http://localhost:3000.

## Notes
- Tout l'accès base se fait server-side avec la clé publishable → pas de `NEXT_PUBLIC`, rien d'exposé au navigateur.
- L'écriture via l'API (`/api/shops/.../ads`) est protégée par `ADS_SPY_TOKEN` (header `Authorization: Bearer`).
- Si `.env.local` n'a pas `SUPABASE_URL`/`SUPABASE_KEY`, l'app tourne quand même mais affiche une bannière « Supabase pas connecté » et un dashboard vide : c'est le signal que le setup n'est pas fait.
