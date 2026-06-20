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

## 5. Lancement
- Lance `npm run dev` et donne l'URL locale (http://localhost:3000) à l'utilisateur.
- Confirme : « Setup terminé. La boutique Marco Moretti et ses concurrents sont chargés, le dashboard affiche le top 50. »

## Notes
- Tout l'accès base se fait server-side avec la clé publishable → pas de `NEXT_PUBLIC`, rien d'exposé au navigateur.
- L'écriture via l'API (`/api/shops/.../ads`) est protégée par `ADS_SPY_TOKEN` (header `Authorization: Bearer`).
- Si `.env.local` n'a pas `SUPABASE_URL`/`SUPABASE_KEY`, l'app tourne quand même mais affiche une bannière « Supabase pas connecté » et un dashboard vide : c'est le signal que le setup n'est pas fait.
