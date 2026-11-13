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

### Option A — Coolify sur VPS Hostinger (solution retenue)

L'API tourne en permanence dans un conteneur Docker géré par Coolify.

- Dépôt déployé : `gitlab.com/jentrepreneur6/boutique-en-ligne`, branche `feature/deployment`
- Fichiers utilisés par Coolify : `server/Dockerfile` et `server/docker-compose.yaml`
- URL publique actuelle :

```
http://jizbyhbadbb5o77vr9wefyvq.31.97.35.128.sslip.io/api
```

> Le VPS étant toujours allumé, il n'y a pas de mise en veille (contrairement à
> l'offre gratuite de Render). La base SQLite est conservée dans un volume Docker.

> ⚠️ Cette URL est servie en **HTTP** (pas de certificat TLS). C'est pourquoi
> `app.json` active `usesCleartextTraffic` via `expo-build-properties` : sans cela,
> Android bloquerait tous les appels réseau de l'application.
> Pour passer en HTTPS : Coolify → application → **Domains** → activer
> **HTTPS / Let's Encrypt** → **Save** → **Redeploy**, puis mettre à jour
> `EXPO_PUBLIC_API_URL` et reconstruire l'APK.

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

Contrainte : l'APK doit peser **moins de 100 Mo**.

Un APK « universel » embarque les bibliothèques natives des 4 architectures
Android (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`), soit ~87 Mo de `.so` à lui
seul. `x86` et `x86_64` ne servent qu'aux émulateurs PC : ils sont inutiles sur un
téléphone réel.

`app.json` limite donc le build aux deux architectures ARM :

```json
"buildArchs": ["arm64-v8a", "armeabi-v7a"]
```

`arm64-v8a` couvre tous les téléphones Android récents, `armeabi-v7a` les anciens
modèles 32 bits. Conséquence : l'APK ne s'installe pas sur un émulateur x86.

Si un futur build dépasse encore 100 Mo, ajouter :

```json
"enableMinifyInReleaseBuilds": true,
"enableShrinkResourcesInReleaseBuilds": true
```

(les deux options vont ensemble : `shrinkResources` exige `minify`).

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
