# Shapio

Plateforme de prêt d'objets entre particuliers. Pas d'argent, juste des points.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML5, CSS3, JavaScript ES6 (vanilla) |
| Backend | Node.js, Express.js |
| Base de données | SQLite (via sql.js) |
| Auth | JWT (jsonwebtoken) + bcrypt |

## Structure du projet

```
Shapio/
├── backend/
│   ├── server.js              # Point d'entrée Express
│   ├── config/
│   │   └── database.js        # Config SQLite (sql.js)
│   ├── middleware/
│   │   └── auth.js            # Middleware JWT
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login, /register
│   │   ├── items.js           # CRUD /api/items
│   │   ├── users.js           # GET /api/users/me, /:id
│   │   ├── messages.js        # GET/POST /api/messages
│   │   ├── wallet.js          # GET /api/wallet
│   │   └── loans.js           # POST /api/loans, /:id/return
│   └── database/
│       ├── schema.sql         # Schéma des tables
│       └── init.js            # Script de seed
├── frontend/
│   ├── index.html             # SPA principale
│   ├── css/
│   │   ├── main.css           # Import de tous les modules
│   │   ├── variables.css      # Variables CSS (couleurs)
│   │   ├── base.css           # Reset & styles de base
│   │   ├── nav.css            # Navigation landing
│   │   ├── hero.css           # Section hero
│   │   ├── sections.css       # Sections landing (how, points, trust)
│   │   ├── onboarding.css     # Formulaires login/signup
│   │   ├── app.css            # Shell de l'app mobile
│   │   ├── home.css           # Écran d'accueil
│   │   ├── swipe.css          # Écran swipe/explorer
│   │   ├── fiche.css          # Détail d'un objet
│   │   ├── messages.css       # Messages & chat
│   │   ├── wallet.css         # Wallet de points
│   │   ├── profile.css        # Profil utilisateur
│   │   └── responsive.css     # Media queries
│   └── js/
│       ├── app.js             # Point d'entrée (imports + exports globaux)
│       ├── router.js          # Navigation entre pages/écrans
│       ├── api.js             # Client API (fetch vers le backend)
│       ├── swipe.js           # Logique du swipe de cartes
│       ├── fiche.js           # Interactions page détail
│       ├── profile.js         # Tabs du profil
│       └── modals.js          # Modales légales
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Installation

### Prérequis

- **Node.js** >= 16
- **npm** >= 8

### Setup

```bash
# 1. Cloner le repo
git clone <url-du-repo>
cd Shapio

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Modifier JWT_SECRET dans .env avec une valeur secrète

# 4. Initialiser la base de données avec les données de démo
npm run db:init

# 5. Lancer le serveur
npm run dev
```

Le serveur démarre sur `http://localhost:3000`.

### Comptes de démo

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| karim@shapio.fr | password123 | Utilisateur principal (72 pts) |
| marie@shapio.fr | password123 | Prêteuse active (85 pts) |
| thomas@shapio.fr | password123 | Utilisateur standard (60 pts) |
| sophie@shapio.fr | password123 | Prêteuse (45 pts) |

## API

Toutes les routes sont préfixées par `/api`. Les routes protégées nécessitent un header `Authorization: Bearer <token>`.

### Auth

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/auth/register` | Créer un compte | Non |
| POST | `/api/auth/login` | Se connecter | Non |

**Register body** : `{ first_name, last_name, email, password, city }`

**Login body** : `{ email, password }`

**Réponse** : `{ token, userId }`

### Items (objets)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/items` | Lister les objets disponibles | Non |
| GET | `/api/items/:id` | Détail d'un objet + avis | Non |
| POST | `/api/items` | Créer un objet | Oui |
| PATCH | `/api/items/:id` | Modifier un objet | Oui |
| DELETE | `/api/items/:id` | Supprimer un objet | Oui |

**Query params GET** : `?category=Tech&limit=20&offset=0`

### Users

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/users/me` | Mon profil complet | Oui |
| GET | `/api/users/:id` | Profil public | Non |

### Wallet

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/wallet` | Solde, transactions, stats | Oui |

### Messages

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/messages/conversations` | Liste des conversations | Oui |
| GET | `/api/messages/:userId` | Messages avec un user | Oui |
| POST | `/api/messages/:userId` | Envoyer un message | Oui |

### Loans (prêts)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/loans` | Demander un emprunt | Oui |
| POST | `/api/loans/:id/return` | Confirmer le retour | Oui |

**Emprunt body** : `{ item_id, days }`

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm start` | Lancer le serveur en production |
| `npm run dev` | Lancer avec auto-reload (--watch) |
| `npm run db:init` | Initialiser la DB avec les données de démo |

## Base de données

### Tables

- **users** : comptes utilisateurs, points, vérifications
- **items** : objets disponibles au prêt
- **loans** : prêts en cours/terminés
- **transactions** : historique des mouvements de points
- **messages** : messagerie entre utilisateurs
- **reviews** : avis sur les prêts
- **swipes** : historique des swipes (like/pass)

### Système de points

1. Chaque nouvel inscrit reçoit **50 points**
2. Le prêteur fixe le prix en **points/jour**
3. Les points sont **bloqués** lors de l'emprunt
4. Les points sont **transférés** au prêteur à la confirmation du retour
5. Plafond : **100 points** par utilisateur

## Contribuer

1. Créer une branche : `git checkout -b feature/ma-feature`
2. Développer et tester localement
3. Commiter : `git commit -m "feat: description"`
4. Pousser : `git push origin feature/ma-feature`
5. Ouvrir une Pull Request

## Licence

MIT
