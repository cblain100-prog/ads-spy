---
description: Met en place (ou renouvelle) l'acces Meta Ad Library — token 60 jours, avec tous les pieges connus
---

Tu configures le `META_ACCESS_TOKEN` de l'Ad Library API. C'est l'etape qui fait perdre
le plus de temps : suis l'ordre, ne saute rien, et VERIFIE chaque etape par un appel API
(ne jamais supposer que ca marche).

## Pre-requis cote utilisateur (une seule fois, irremplacable)

1. **Une app Meta** sur developers.facebook.com (n'importe quel type). Note son **App ID**
   (developers.facebook.com -> ton app -> Parametres -> General -> Identifiant de l'app) et
   sa **Cle secrete** (App Secret, meme page, bouton « Afficher »).
2. **Confirmation d'identite OBLIGATOIRE** pour acceder a l'Ad Library API. Sur
   **https://www.facebook.com/ID** (piece d'identite + localisation), avec le compte FB
   perso lie a l'app. Sans ca, l'API renvoie `code 10 / subcode 2332002` meme avec un
   token techniquement valide. Ce n'est PAS dans le dashboard dev ni dans l'Explorateur
   Graph, et c'est requis aussi pour `ad_type=ALL` (le dataset DSA UE).

Demande ces 3 valeurs a l'utilisateur (App ID, App Secret, et confirmation que son
identite est validee). Ne lui fais PAS chercher des permissions/scopes : `public_profile`
suffit, l'acces vient de la confirmation d'identite.

## Etape 1 — obtenir un token court

L'utilisateur genere un token dans l'Explorateur Graph
(https://developers.facebook.com/tools/explorer/ -> son app -> « Token utilisateur » ->
**Generate Access Token**) et te le donne. Attention : ces tokens durent **~1-2 h**,
enchaine vite.

## Etape 2 — verifier identite + recuperer l'App ID

Avec le token court dans la variable SHORT, appelle `GET /v21.0/debug_token` avec
`input_token=$SHORT` et `access_token=$SHORT` : lis `data.app_id` (= App ID) et
`data.is_valid`. Puis teste l'acces Ad Library via `GET /v21.0/ads_archive` avec
`ad_type=ALL`, `ad_active_status=ACTIVE`, `ad_reached_countries=["FR"]`,
`search_page_ids=["<une page concurrente>"]`, `fields=id,page_name,eu_total_reach`,
`limit=2`, `access_token=$SHORT`.

- Renvoie des creas -> identite OK, continue.
- `subcode 2332002` -> identite **pas** confirmee : stoppe, renvoie l'utilisateur sur
  facebook.com/ID. Inutile d'aller plus loin tant que ce n'est pas regle.
- `code 190` -> token court deja expire : redemande-en un.

## Etape 3 — echanger contre un token 60 jours

Appelle `GET /v21.0/oauth/access_token` avec `grant_type=fb_exchange_token`,
`client_id=<APP_ID>`, `client_secret=<APP_SECRET>`, `fb_exchange_token=$SHORT`.

- Renvoie `access_token` -> c'est le token **60 jours** (`expires_in` ~5 184 000 s).
- « Error validating client secret » -> l'App Secret ne correspond pas a l'App ID. Reprends
  le bon secret de **la meme app** (celle du `data.app_id` ci-dessus).

## Etape 4 — poser le token

- Ecris-le dans `.env.local` (`META_ACCESS_TOKEN=...`).
- Sur Vercel : `vercel env rm META_ACCESS_TOKEN production --yes` puis
  `printf '%s' "<token60j>" | vercel env add META_ACCESS_TOKEN production`.
- Redeploie (`vercel --prod --yes`).
- Re-teste l'appel `ads_archive` de l'etape 2 avec le nouveau token pour confirmer.

## Renouvellement

Le token 60 jours expire ~tous les 2 mois. Pour renouveler : refais etapes 1->4 (token
court frais -> echange -> pose). Pour ne **jamais** renouveler : cree un *System User token*
dans Business Settings (l'app doit d'abord etre ajoutee au portefeuille business via
Parametres -> Comptes -> Applications).
