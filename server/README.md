# Élan — Serveur Backend REST API

Backend Express.js + TypeScript avec base de données SQLite pour l'application mobile **Élan**, organisée comme une **place de marché multi-vendeurs**.

## 🚀 Démarrage Rapide

### Prérequis
- Node.js >= 20 (ou Bun)

### Installation et lancement
Depuis la racine du projet :
```bash
npm run server
```

Ou directement dans le dossier `server/` :
```bash
cd server
npm install
npm run dev
```

Le serveur démarre sur **`http://localhost:3001`**. Les images téléversées sont servies sur **`http://localhost:3001/uploads/<fichier>`**.

Variables d'environnement utiles (`server/.env`) :

| Variable | Description |
|---|---|
| `PORT` | Port d'écoute (3001 par défaut) |
| `AUTH_SECRET` | Secret HMAC utilisé pour signer les jetons de session |
| `STRIPE_SECRET_KEY` | Clé Stripe (mode test accepté) |

---

## 🗄️ Base de Données SQLite

- Fichier de données : `server/data/elan.sqlite` (ignoré par Git)
- Auto-initialisation, migration et seed au premier démarrage.
- Supporte `better-sqlite3` avec repli automatique vers `node:sqlite` natif (Node.js 22+).
- Uploads : `server/uploads/` (ignoré par Git).

### Modèle multi-vendeurs

- `users` — comptes clients et vendeurs (`role = customer | seller`).
- `sellers` — boutiques (`shopName`, `slug`, `tagline`, `avatarUrl`, `bannerUrl`, `status`).
- `products.sellerId` — chaque produit appartient à une boutique.
- `orders` — commande globale d'un acheteur.
- `order_sellers` — sous-commande par vendeur (statut, sous-total, remise, part de livraison, total).
- `order_items.orderSellerId` — lignes rattachées à la sous-commande du bon vendeur.
- `invoices` — une facture par sous-commande vendeur.
- `coupons` — codes promo **propres à chaque vendeur**.
- `favorites`, `addresses`, `reviews`, `coupon_redemptions`.

### Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Vendeur — Atelier Élan Paris | `vendeur@elan.com` | `password123` |
| Vendeur — Élan Sound | `vendeur.sound@elan.com` | `password123` |
| Vendeur — Maison Élan | `vendeur.maison@elan.com` | `password123` |
| Vendeur — Marché Élan | `vendeur.marche@elan.com` | `password123` |
| Client | `thomas.lefebvre@example.com` | `password123` |

Codes promo seedés : `ELAN10`, `SOUND15`, `MAISON5`, `MARCHE10`.

---

## 🔐 Authentification

Les jetons sont des HMAC signés (`Authorization: Bearer <token>`). Les mots de passe sont hachés avec `scrypt` ; les anciens mots de passe en clair sont migrés à la première connexion.

`POST /api/auth/register` accepte `role: "customer" | "seller"`. Pour un vendeur, `shopName` est obligatoire ; `tagline` et `description` sont optionnels. La réponse contient `{ user, seller, token }`.

---

## 📡 Endpoints API

### Catalogue & produits
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Statut du serveur |
| `GET` | `/api/products` | Produits filtrés (`?q=`, `?category=`, `?minPrice=`, `?sort=`, `?sellerId=`, `?sellerSlug=`) |
| `GET` | `/api/products/:id` | Détail d'un produit, avis et boutique vendeur |
| `POST` | `/api/products` | Création d'un produit (vendeur) |
| `PUT` | `/api/products/:id` | Mise à jour (propriétaire uniquement) |
| `DELETE` | `/api/products/:id` | Suppression (propriétaire uniquement) |

### Boutiques publiques
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sellers` | Liste des boutiques actives |
| `GET` | `/api/sellers/:idOrSlug` | Profil public (KPI, note, nombre de produits) |
| `GET` | `/api/sellers/:idOrSlug/products` | Catalogue public d'une boutique |

### Avis
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reviews` | Avis récents, par produit (`?productId=`) ou par boutique (`?sellerId=`) |
| `POST` | `/api/reviews` | Création d'un avis (connecté, achat vérifié détecté) |
| `DELETE` | `/api/reviews/:id` | Suppression par l'auteur |
| `POST` | `/api/seller/reviews/:id/reply` | Réponse du vendeur à un avis de sa boutique |

### Panier, favoris & adresses
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/favorites` | Produits favoris de l'utilisateur |
| `GET` | `/api/favorites/ids` | Identifiants favoris (synchronisation) |
| `POST` | `/api/favorites/:productId/toggle` | Ajoute/retire un favori |
| `GET` | `/api/addresses` | Carnet d'adresses |
| `POST` | `/api/addresses` | Ajout d'une adresse |
| `PATCH` | `/api/addresses/:id` | Modification / adresse par défaut |
| `DELETE` | `/api/addresses/:id` | Suppression |

### Codes promo
| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/coupons/validate` | Prévisualise remise et répartition par vendeur |
| `GET` | `/api/seller/coupons` | Codes promo du vendeur connecté |
| `POST` | `/api/seller/coupons` | Création |
| `PATCH` | `/api/seller/coupons/:id` | Modification / activation |
| `DELETE` | `/api/seller/coupons/:id` | Suppression |

Les codes promo sont **scopés par vendeur** : la remise ne s'applique qu'aux articles de la boutique concernée.

### Commandes & paiement
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | Commandes de l'acheteur connecté, avec sous-commandes vendeurs |
| `GET` | `/api/orders/:id` | Détail d'une commande |
| `POST` | `/api/orders` | Création multi-vendeurs : prix, remises, stock et factures recalculés côté serveur |
| `PATCH` | `/api/orders/:id/status` | Mise à jour du statut d'**une sous-commande** (`orderSellerId` obligatoire) |
| `POST` | `/api/payments/create-intent` | Intent Stripe (montant validé côté serveur) |
| `GET` | `/api/factures/:id` | Facture d'une sous-commande vendeur |

À la création d'une commande, le serveur :
1. répartit les articles par vendeur ;
2. recalcule les prix depuis la base ;
3. applique le code promo du vendeur concerné ;
4. répartit les frais de livraison au prorata (arrondi au plus fort reste) ;
5. décrémente les stocks ;
6. génère une facture par vendeur.

Le statut global d'une commande est dérivé des statuts de ses sous-commandes.

### Espace vendeur
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/seller/profile` | Profil boutique + KPI |
| `PUT` | `/api/seller/profile` | Nom, accroche, description, avatar, bannière |
| `GET` | `/api/seller/dashboard` | Revenus, commandes à traiter, stocks faibles, ventes 14 jours |
| `GET` | `/api/seller/products` | Catalogue du vendeur |
| `GET` | `/api/seller/orders` | Sous-commandes du vendeur (acheteur, articles, totaux, facture) |
| `GET` | `/api/seller/invoices` | Factures du vendeur |
| `GET` | `/api/seller/reviews` | Avis reçus |
| `POST` | `/api/uploads` | Téléversement d'image (multipart `image`, 5 Mo max) |

---

## 📱 Utilisation Mobile (React Native / Expo)

Le service typé `src/services/api.ts` couvre l'ensemble des endpoints : catalogue, boutiques publiques, favoris, adresses, codes promo, commandes multi-vendeurs, espace vendeur et uploads.

```typescript
import { api, resolveMediaUrl } from '@/services/api';

// Catalogue
const products = await api.getProducts({ category: 'Mode' });

// Boutique publique
const shop = await api.getSeller('atelier-elan-paris');

// Commande multi-vendeurs (les prix sont recalculés côté serveur)
const order = await api.createOrder({
  items: [{ productId: 'casque-elan-h1', quantity: 1 }],
  shippingAddress: '12 rue de Rivoli, 75001 Paris',
  deliveryMode: 'standard',
  couponCode: 'SOUND15',
});

// Image téléversée -> URL affichable
const { url } = await api.uploadImage(localUri);
const imageUrl = resolveMediaUrl(url);
```
