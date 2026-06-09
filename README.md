# Shapio

Plateforme de prêt d'objets entre voisins (Lille). Front **Vite + JavaScript (modules ES)**, backend **Supabase** (auth, base de données, storage).

## Prérequis

- Node.js ≥ 18
- Un projet Supabase (URL + clé anon/publishable)

## Installation

```bash
npm install
cp .env.example .env   # puis renseigner les valeurs Supabase
```

`.env` :

```
VITE_SUPABASE_URL=https://<votre-projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<votre-cle-anon-publishable>
```

> La clé anon/publishable est **publique** par nature (la sécurité repose sur les **RLS**
> côté Supabase). Elle n'est pas committée : `.env` est ignoré par git.

## Développement

```bash
npm run dev       # serveur local avec rechargement à chaud → http://localhost:5173
npm run lint      # ESLint (no-undef = filet de sécurité du refactoring)
npm run build     # build de production → dist/
npm run preview   # sert le build dist/ localement
```

## Base de données locale (Docker) — tester sans toucher à la prod

Pour développer contre une base **locale** (Supabase en Docker) plutôt que le Supabase
hébergé :

```bash
npm run db:start   # lance Supabase local via Docker (Postgres, Auth, Storage, Studio)
npm run db:status  # affiche l'URL d'API + les clés locales
npm run dev        # avec .env.local présent, le dev tape sur la BDD locale
```

Le fichier **`.env.local`** (fourni) pointe sur le local et a priorité sur `.env`.
Guide complet (prérequis Docker, seed, réplication exacte de la prod via `db pull`,
limites du schéma inféré, dépannage) : **[docs/LOCAL_DB.md](docs/LOCAL_DB.md)**.

| Commande | Effet |
|---|---|
| `npm run db:start` / `db:stop` | Démarre / arrête la stack Docker |
| `npm run db:status` | URL + clés locales |
| `npm run db:reset` | Recrée la BDD (migrations + seed) |
| `npm run db:pull` | Importe le schéma réel depuis la prod |

## Hébergement local

`npm run build` produit un dossier `dist/` statique et autonome, servable par n'importe quel
serveur web : `npm run preview`, `npx serve dist`, nginx, IIS…

## Architecture

```
index.html              # shell HTML (head SEO/OG, pages SPA, modales)
src/
  main.js               # point d'entrée : styles, registre window, init
  lib/
    supabase.js         # client Supabase (config via .env)
    dom.js              # navigation & helpers UI (go, setTab, showError…)
  features/             # logique métier par domaine
    auth.js  profile.js  objects.js  loans.js  reviews.js
    messages.js  swipe.js  wallet.js  legal.js
  styles/               # CSS découpé (tokens, landing, app, components)
scripts/                # scripts de migration (one-shot, depuis index.htm)
index.htm               # MONOLITHE D'ORIGINE conservé pour référence/diff
```

### Notes techniques

- **SPA vanilla** : navigation par affichage/masquage de `.page` (fonction `go`).
- **Handlers inline** (`onclick="…"`) : les fonctions appelées sont ré-exposées sur `window`
  dans `src/main.js` (`Object.assign(window, …)`).
- **État partagé** : porté par `window.*` (ex. `window.currentProfile`, `window.prevTab`).
- `index.htm` (monolithe d'origine) peut être supprimé une fois la migration validée.

## Branches

- `main` : version d'origine (ne pas y pousser le refactoring sans validation).
- `recette` : refactoring Vite, destinée aux tests locaux / serveur de recette.
