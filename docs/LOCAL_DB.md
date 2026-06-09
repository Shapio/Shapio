# Base de données locale (Supabase + Docker)

Objectif : développer et tester **sans toucher au Supabase hébergé**. Le Supabase CLI
lance toute la stack Supabase (Postgres, Auth, Storage, Studio…) dans **Docker**, en local.

```
┌─────────────── Votre machine ───────────────┐
│  npm run dev (Vite :5173)                    │
│        │  lit .env.local                     │
│        ▼                                      │
│  Supabase LOCAL (Docker)  :54321 API         │
│   Postgres :54322 · Studio :54323            │
└──────────────────────────────────────────────┘
   ⇡ aucune connexion à la prod shapio.fr
```

## 1. Prérequis

- **Docker Desktop** installé et **démarré** (Windows : WSL2 activé).
  Vérif : `docker info` doit répondre sans erreur.
- Dépendances du projet installées : `npm install` (le CLI Supabase est en devDependency).

## 2. Démarrer la base locale

```bash
npm run db:start      # = supabase start (télécharge les images Docker au 1er lancement)
npm run db:status     # affiche URL d'API + clés (anon/service_role) + Studio
```

`db:start` applique automatiquement :
- les migrations de `supabase/migrations/` (schéma),
- le `supabase/seed.sql` (données de démo).

Notez l'**API URL** (`http://127.0.0.1:54321`) et l'**anon key** affichées.

## 3. Pointer l'app sur le local

Le fichier **`.env.local`** (déjà fourni) a la priorité sur `.env` pour `npm run dev`.
Vérifiez que sa clé correspond à la sortie de `npm run db:status` (copiez l'`anon key`
si elle diffère), puis :

```bash
npm run dev           # http://localhost:5173 → tape sur la BDD LOCALE
```

> Pour repasser sur la prod : renommez/supprimez `.env.local` (Vite reprend `.env`).

- **Studio** (interface BDD) : http://127.0.0.1:54323
- **Créer un compte de test** : inscrivez-vous via l'app. En local, la confirmation
  email est **désactivée** (`config.toml` → `enable_confirmations = false`), donc le
  compte est actif immédiatement.

## 4. Commandes utiles

| Commande | Effet |
|---|---|
| `npm run db:start` | Démarre la stack Docker |
| `npm run db:stop` | Arrête la stack (les données persistent) |
| `npm run db:status` | URL + clés locales |
| `npm run db:reset` | **Recrée** la BDD : rejoue migrations + seed (⚠️ efface les données locales) |
| `npm run db:pull` | Importe le schéma de la prod (voir §6) |

## 5. ⚠️ Limite du schéma fourni (inféré)

`supabase/migrations/20260609120000_init_inferred.sql` est **reconstruit depuis les
requêtes du front**. Il crée toutes les **tables** (users, objects, loans, reviews,
messages, favoris) et les **buckets** (avatars, objects), avec des **RLS permissives
réservées au local**.

Il ne contient **pas** la logique serveur de la prod (invisible côté client) :
- création d'un **prêt** (`loans`) — le front n'insère jamais dans `loans` ;
- **transfert de points** au retour (message `LOAN_RETURNED`) ;
- recalculs éventuels (`note_moyenne`, `nb_prets`).

➡️ Conséquence : naviguer / créer un objet / messagerie / favoris fonctionnent en local ;
le cycle de prêt complet (acceptation → prêt en cours → retour → points) peut nécessiter
la logique serveur ci-dessous.

## 6. Répliquer EXACTEMENT la prod (recommandé si vous avez l'accès)

Pour obtenir le schéma **réel** (tables **et** triggers/fonctions) :

```bash
npx supabase login                       # token depuis app.supabase.com/account/tokens
npx supabase link --project-ref tohbrkqbfcllixwzbill
npm run db:pull                          # génère une migration depuis la prod
# (optionnel) supabase db dump --data-only -f supabase/seed_prod.sql  # données
npm run db:reset                         # rejoue le schéma réel en local
```

> `db:pull` lit le **schéma** uniquement (pas de modification de la prod). Le mot de
> passe de la base prod vous sera demandé. Une fois la vraie migration générée, vous
> pouvez supprimer `..._init_inferred.sql` pour éviter les doublons.

## 7. Dépannage

- **`docker: command not found` / `Cannot connect to the Docker daemon`** → démarrez
  Docker Desktop.
- **Ports occupés (54321-54324)** → `npm run db:stop`, ou changez les ports dans
  `supabase/config.toml`.
- **L'app tape encore sur la prod** → un `.env.local` est-il présent et chargé ?
  Redémarrez `npm run dev` après modification d'un `.env*`.
- **Clé invalide** → recopiez l'`anon key` exacte depuis `npm run db:status`.
