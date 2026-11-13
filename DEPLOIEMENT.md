# Installer l'application sur Android

## 1. Générer l'APK (EAS Build)

Pas besoin d'Android Studio : le build se fait dans le cloud.

```powershell
eas build -p android --profile preview
```

Le profil `preview` est configuré dans `eas.json` pour produire un **APK** installable
(et non un AAB réservé au Play Store).

À la fin du build, EAS affiche un lien du type :

```
https://expo.dev/artifacts/eas/xxxxxxxx.apk
```

## 2. Installer l'APK sur le téléphone

1. Ouvrir le lien du build sur le téléphone (Chrome).
2. Télécharger l'APK.
3. Ouvrir le fichier téléchargé.
4. Android demande d'autoriser l'installation depuis cette source :
   **Paramètres → Autoriser depuis cette source**.
5. Appuyer sur **Installer**, puis **Ouvrir**.

L'application est autonome : elle embarque le JavaScript, donc elle n'a **pas besoin
de Metro, d'Expo Go ni du Wi-Fi** pour démarrer.

## 3. Rendre l'API accessible depuis Internet

L'application a besoin de l'API pour afficher les produits. Une URL `localhost` ou
une IP `192.168.x.x` ne fonctionne que sur le même Wi-Fi. Pour que l'application
fonctionne en données mobiles, l'API doit être accessible via Internet.

### Option A — Render (gratuit, URL stable) — recommandé

1. Pousser le projet sur GitHub.
2. Créer un compte sur [render.com](https://render.com).
3. **New → Blueprint**, choisir le dépôt GitHub : Render lit `render.yaml`.
4. Renseigner `STRIPE_SECRET_KEY` (clé `sk_test_...` de `server/.env`).
5. Attendre le déploiement, puis copier l'URL fournie, par exemple :
   `https://elan-api.onrender.com`.

L'URL de l'API est alors `https://elan-api.onrender.com/api`.

> Le plan gratuit Render met le service en veille après une période d'inactivité :
> la première requête peut prendre 20–30 secondes. La base SQLite est réinitialisée
> à chaque redémarrage, mais les produits de démonstration sont reseedés au démarrage.

### Option B — Tunnel Cloudflare (temporaire, aucune inscription)

1. Démarrer le serveur sur le PC :
   ```powershell
   npm run server
   ```
2. Dans un autre terminal, lancer un tunnel :
   ```powershell
   cloudflared tunnel --url http://localhost:3001
   ```
3. Copier l'URL `https://....trycloudflare.com` affichée.
4. L'URL de l'API est `https://....trycloudflare.com/api`.

> Le PC doit rester allumé et connecté à Internet pendant la démonstration.
> L'URL change si le tunnel est relancé.

## 4. Configurer l'URL de l'API dans le build

Avec EAS, les variables `EXPO_PUBLIC_*` doivent être fournies au build (le fichier
`.env` local n'est pas fiable pour un build cloud) :

```powershell
eas env:set --name EXPO_PUBLIC_API_URL --value "https://VOTRE-URL/api" --environment preview --visibility plaintext
eas env:set --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "pk_test_..." --environment preview --visibility plaintext
```

Puis relancer :

```powershell
eas build -p android --profile preview
```

## 5. Taille de l'application

Le build Android précédent pèse **48,8 Mo**, donc sous la limite de 100 Mo.
Si un futur build dépasse 100 Mo, ajouter `expo-build-properties` avec
`enableProguardInReleaseBuilds` et `enableShrinkResources`.

## 6. Fonctionnement hors-ligne

- L'APK démarre sans Wi-Fi et sans serveur de développement.
- Les produits, boutiques, commandes et paiements nécessitent l'API en ligne.
- Les commandes payées en mode simulation sont stockées localement
  (`AsyncStorage`) et synchronisées au retour de la connexion.

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Client | `thomas.lefebvre@example.com` | `password123` |
| Vendeur | `vendeur@elan.com` | `password123` |
