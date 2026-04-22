# Shapio

Plateforme de prêt d'objets entre particuliers. Pas d'argent, juste des points.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML5, CSS3, JavaScript ES6 (vanilla, modules) |
| Backend | Node.js, Express.js |
| Base de données | SQLite (via sql.js) |
| Auth | JWT (jsonwebtoken) + bcrypt |

## Installation rapide

```bash
# 1. Cloner et installer
git clone <url-du-repo>
cd Shapio
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Modifier JWT_SECRET dans .env

# 3. Initialiser la DB avec les données de test
npm run db:init

# 4. Lancer le serveur
npm run dev
```

Ouvrir `http://localhost:3000` dans le navigateur.

## Comptes de test

| Email | Mot de passe | Points | Description |
|-------|-------------|--------|-------------|
| **karim@shapio.fr** | password123 | 72 pts | Compte principal, 3 objets, messages, avis |
| marie@shapio.fr | password123 | 85 pts | Prêteuse active, drone + trottinette |
| thomas@shapio.fr | password123 | 60 pts | Manette PS5 + guitare |
| sophie@shapio.fr | password123 | 45 pts | Tente + appareil photo + vélo |
| lucas@shapio.fr | password123 | 55 pts | Aspirateur + tondeuse |

**Pour tester** : se connecter avec `karim@shapio.fr` / `password123`. Ce compte a des conversations, des transactions et des avis pré-chargés.

## Fonctionnalités opérationnelles

| Fonctionnalité | Statut | Détails |
|----------------|--------|---------|
| Inscription | Fonctionnel | 4 étapes : infos, téléphone, OTP, mot de passe |
| Connexion | Fonctionnel | Email + mot de passe, JWT persisté |
| Déconnexion | Fonctionnel | Paramètres > Se déconnecter |
| Page d'accueil | Fonctionnel | Objets chargés depuis l'API |
| Swipe | Fonctionnel | Swipe gauche/droite, filtre par catégorie |
| Fiche objet | Fonctionnel | Détail complet + avis depuis l'API |
| Demande d'emprunt | Fonctionnel | Bloque les points, crée le prêt |
| Messages | Fonctionnel | Conversations réelles, envoi de messages |
| Chat | Fonctionnel | Échange de messages en temps réel |
| Wallet | Fonctionnel | Solde, transactions, historique |
| Profil | Fonctionnel | Stats, objets, avis, vérifications |
| Ajout d'objet | Fonctionnel | Formulaire complet |
| Vérification téléphone | Mock (dev) | Code toujours `1234` |

## Vérification téléphone — Stratégie de test gratuit

### Mode actuel (dev)

La vérification SMS est **simulée** : le code OTP est toujours **`1234`**. Aucun SMS n'est envoyé. Le code est affiché dans la console du serveur et sur la page d'inscription.

### Passer en production

Pour activer les vrais SMS, voici les options par ordre de recommandation :

#### Option 1 : Twilio (recommandé)

1. Créer un compte sur [twilio.com](https://www.twilio.com)
2. Obtenir un numéro Twilio (trial = gratuit, ~100 SMS)
3. Installer le SDK : `npm install twilio`
4. Ajouter dans `.env` :
   ```
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
   ```
5. Modifier `backend/routes/phone.js` : remplacer le bloc `// TODO: En production` par :
   ```js
   const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
   await twilio.messages.create({
     body: `Shapio: votre code est ${code}`,
     to: phone,
     from: process.env.TWILIO_PHONE_NUMBER
   });
   ```

#### Option 2 : OVH SMS (moins cher en France)

1. Activer les SMS sur [ovh.com/manager](https://www.ovh.com/manager)
2. Installer : `npm install @ovh-api/sms`
3. Configurer les clés API OVH dans `.env`

#### Option 3 : Firebase Auth (gratuit jusqu'à 10k/mois)

1. Créer un projet Firebase
2. Activer Phone Auth dans la console Firebase
3. Utiliser le SDK Firebase côté client

### Test entre les deux modes

La variable `SMS_PROVIDER` dans `.env` contrôle le mode :
- Absente ou différente de `twilio` → **mode dev** (code = 1234)
- `SMS_PROVIDER=twilio` → **mode production** (vrai SMS)

## Consulter la base de données

### Via l'API (navigateur)

L'API expose un explorateur de DB en lecture seule :

```bash
# Lister les tables
curl http://localhost:3000/api/db/tables

# Voir le contenu d'une table (sans les mots de passe pour users)
curl http://localhost:3000/api/db/table/users
curl http://localhost:3000/api/db/table/items
curl http://localhost:3000/api/db/table/loans
curl http://localhost:3000/api/db/table/transactions
curl http://localhost:3000/api/db/table/messages
curl http://localhost:3000/api/db/table/reviews
curl http://localhost:3000/api/db/table/swipes

# Pagination
curl "http://localhost:3000/api/db/table/items?limit=10&offset=0"

# Requête SQL libre (SELECT uniquement)
curl "http://localhost:3000/api/db/query?sql=SELECT%20*%20FROM%20users%20WHERE%20city='Mulhouse'"
```

Ou directement dans le navigateur :
- `http://localhost:3000/api/db/tables`
- `http://localhost:3000/api/db/table/users`
- `http://localhost:3000/api/db/table/transactions`

### Via un outil graphique

Le fichier SQLite est à `backend/database/shapio.db`. Tu peux l'ouvrir avec :

- **DB Browser for SQLite** (gratuit) : [sqlitebrowser.org](https://sqlitebrowser.org)
- **TablePlus** (Mac, freemium) : [tableplus.com](https://tableplus.com)
- **DBeaver** (gratuit) : [dbeaver.io](https://dbeaver.io)
- **Extension VS Code** : "SQLite Viewer" ou "SQLite"

### Réinitialiser la DB

```bash
rm backend/database/shapio.db
npm run db:init
```

## Structure du projet

```
Shapio/
├── backend/
│   ├── server.js              # Point d'entrée Express
│   ├── config/database.js     # Config SQLite (sql.js)
│   ├── middleware/auth.js      # Middleware JWT
│   ├── routes/
│   │   ├── auth.js            # Login / Register
│   │   ├── items.js           # CRUD objets
│   │   ├── users.js           # Profil utilisateur
│   │   ├── messages.js        # Messagerie
│   │   ├── wallet.js          # Points & transactions
│   │   ├── loans.js           # Emprunts & retours
│   │   ├── phone.js           # Vérification téléphone (mock)
│   │   ├── swipes.js          # Swipe like/pass
│   │   └── db.js              # Explorateur de DB
│   └── database/
│       ├── schema.sql         # Schéma des tables
│       └── init.js            # Seed de données de test
├── frontend/
│   ├── index.html             # SPA principale
│   ├── css/                   # 14 modules CSS
│   │   ├── main.css           # Point d'entrée (@import)
│   │   ├── variables.css      # Design tokens
│   │   └── ...
│   └── js/
│       ├── app.js             # Logique principale (tout connecté à l'API)
│       ├── api.js             # Client HTTP
│       └── modals.js          # Modales légales
├── package.json
├── .env.example
└── .gitignore
```

## API

Toutes les routes sont préfixées par `/api`. Les routes marquées **Auth** nécessitent `Authorization: Bearer <token>`.

### Auth
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | Non | `{ first_name, last_name, email, password, city }` |
| POST | `/api/auth/login` | Non | `{ email, password }` → `{ token, userId }` |

### Items
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/items?category=Tech&limit=20` | Non | Liste des objets disponibles |
| GET | `/api/items/:id` | Non | Détail + avis |
| POST | `/api/items` | Oui | Créer un objet |
| PATCH | `/api/items/:id` | Oui | Modifier |
| DELETE | `/api/items/:id` | Oui | Supprimer |

### Users
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/users/me` | Oui | Mon profil + objets + avis |
| GET | `/api/users/:id` | Non | Profil public |

### Messages
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/messages/conversations` | Oui | Liste des conversations |
| GET | `/api/messages/:userId` | Oui | Messages avec un user |
| POST | `/api/messages/:userId` | Oui | Envoyer `{ content }` |

### Wallet
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/wallet` | Oui | Solde + transactions |

### Loans
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/loans` | Oui | `{ item_id, days }` — emprunter |
| POST | `/api/loans/:id/return` | Oui | Confirmer le retour (prêteur) |

### Phone
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/phone/send-code` | Non | `{ phone }` — envoyer OTP (dev: 1234) |
| POST | `/api/phone/verify` | Non | `{ phone, code }` — vérifier |
| POST | `/api/phone/confirm` | Oui | `{ phone }` — associer au compte |

### Swipes
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/swipes` | Oui | `{ item_id, direction }` |
| GET | `/api/swipes/unswiped?category=Tech` | Oui | Objets pas encore swipés |

### DB Explorer
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/db/tables` | Lister les tables |
| GET | `/api/db/table/:name?limit=50` | Contenu d'une table |
| GET | `/api/db/query?sql=SELECT...` | Requête SQL (SELECT only) |

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm start` | Production |
| `npm run dev` | Dev avec auto-reload (--watch) |
| `npm run db:init` | Réinitialiser la DB avec les données de test |

## Licence

MIT
