# Déploiement Frontend sur Vercel

## Méthode 1: Via l'interface web (Recommandé)

### Étape 1: Préparer le repository

```bash
# Commit et push tous les changements
git add .
git commit -m "Préparation déploiement production"
git push origin main
```

### Étape 2: Connecter à Vercel

1. Aller sur https://vercel.com
2. Se connecter avec GitHub
3. Cliquer sur "Add New Project"
4. Sélectionner le repository `Junior620/suivi-achat`
5. Cliquer sur "Import"

### Étape 3: Configurer le projet

Dans la page de configuration:

**Project Name**: `cocoatrack` (ou votre choix)

**Framework Preset**: Other

**Root Directory**: `./` (laisser par défaut)

**Build Command**: (laisser vide)

**Output Directory**: `frontend`

**Install Command**: (laisser vide)

### Étape 4: Variables d'environnement

Cliquer sur "Environment Variables" et ajouter:

```
Name: VITE_API_URL
Value: https://cocoatrack-api-XXXXX.azurewebsites.net
```

(Remplacer XXXXX par le nom de votre App Service Azure)

### Étape 5: Déployer

Cliquer sur "Deploy"

Vercel va:
- Cloner le repository
- Servir les fichiers du dossier `frontend`
- Générer une URL de production

Votre app sera accessible sur: `https://cocoatrack-xxxxx.vercel.app`

### Étape 6: Mettre à jour le CORS

Retourner sur Azure et mettre à jour CORS_ORIGINS:

```bash
az webapp config appsettings set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --settings \
    CORS_ORIGINS="https://cocoatrack-xxxxx.vercel.app,http://localhost:3000"
```

### Étape 7: Mettre à jour l'URL API

Modifier `frontend/js/api.js` ligne 6:

```javascript
if (window.location.hostname.includes('vercel.app')) {
    return 'https://cocoatrack-api-XXXXX.azurewebsites.net/api/v1';
}
```

Puis commit et push:

```bash
git add frontend/js/api.js
git commit -m "Update API URL for production"
git push origin main
```

Vercel redéploiera automatiquement.

---

## Méthode 2: Via Vercel CLI

### Installation

```bash
npm i -g vercel
```

### Connexion

```bash
vercel login
```

### Déploiement

```bash
# Depuis la racine du projet
vercel

# Suivre les instructions:
# - Set up and deploy? Yes
# - Which scope? Votre compte
# - Link to existing project? No
# - Project name? cocoatrack
# - In which directory is your code located? ./
# - Want to override settings? Yes
# - Output Directory? frontend
# - Build Command? (laisser vide)
# - Development Command? (laisser vide)

# Pour déployer en production
vercel --prod
```

---

## Configuration du domaine personnalisé (Optionnel)

### Dans Vercel Dashboard

1. Aller dans Settings > Domains
2. Ajouter votre domaine (ex: cocoatrack.com)
3. Suivre les instructions pour configurer les DNS

### Mettre à jour CORS

```bash
az webapp config appsettings set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --settings \
    CORS_ORIGINS="https://cocoatrack.com,https://www.cocoatrack.com,http://localhost:3000"
```

---

## Vérification

### Tester l'application

1. Ouvrir `https://cocoatrack-xxxxx.vercel.app`
2. Créer un compte
3. Se connecter
4. Vérifier que toutes les fonctionnalités marchent

### Vérifier la PWA

1. Ouvrir les DevTools (F12)
2. Aller dans Application > Service Workers
3. Vérifier que le Service Worker est actif
4. Tester l'installation (bouton + dans la barre d'adresse)

### Vérifier les logs

Dans Vercel Dashboard:
- Deployments > Cliquer sur le déploiement > Function Logs

---

## Redéploiement automatique

Vercel redéploie automatiquement à chaque push sur `main`.

Pour désactiver:
- Settings > Git > Production Branch > Désactiver

Pour déployer manuellement:
```bash
vercel --prod
```

---

## Rollback

Si un déploiement pose problème:

1. Aller dans Deployments
2. Trouver le déploiement précédent qui fonctionnait
3. Cliquer sur les 3 points > Promote to Production

---

## Monitoring

### Analytics

Vercel fournit des analytics gratuits:
- Settings > Analytics > Enable

### Logs en temps réel

```bash
vercel logs https://cocoatrack-xxxxx.vercel.app --follow
```

---

## Troubleshooting

### Erreur "Failed to load resource"

- Vérifier que l'URL API est correcte dans `api.js`
- Vérifier que CORS est configuré sur Azure

### Service Worker ne s'active pas

- Vérifier que l'app est servie en HTTPS
- Vérifier les headers dans `vercel.json`
- Vider le cache du navigateur

### PWA ne s'installe pas

- Vérifier que `manifest.json` est accessible
- Vérifier les icônes dans `frontend/images/`
- Tester sur mobile (Chrome Android ou Safari iOS)
