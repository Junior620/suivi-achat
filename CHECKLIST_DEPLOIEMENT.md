# ✅ Checklist de Déploiement CocoaTrack

## 📦 Préparation

- [ ] Tous les fichiers de test et debug supprimés
- [ ] `.gitignore` mis à jour
- [ ] Variables d'environnement configurées
- [ ] Code commité et pushé sur GitHub

## ☁️ Backend Azure

### Prérequis
- [ ] Compte Azure actif
- [ ] Azure CLI installé et connecté (`az login`)
- [ ] Abonnement Azure vérifié (`az account show`)

### Déploiement
- [ ] Groupe de ressources créé
- [ ] Base de données PostgreSQL créée
- [ ] Firewall PostgreSQL configuré
- [ ] App Service créé
- [ ] Variables d'environnement configurées
- [ ] Code backend déployé
- [ ] Startup command configuré
- [ ] Migrations appliquées (`alembic upgrade head`)

### Vérification
- [ ] API accessible: `https://cocoatrack-api-XXXXX.azurewebsites.net/docs`
- [ ] Endpoint health fonctionne: `/api/v1/health`
- [ ] Connexion base de données OK
- [ ] Logs sans erreurs

### URLs à noter
```
Backend URL: https://cocoatrack-api-XXXXX.azurewebsites.net
API Docs: https://cocoatrack-api-XXXXX.azurewebsites.net/docs
Database: cocoatrack-db-XXXXX.postgres.database.azure.com
```

## 🎨 Frontend Vercel

### Prérequis
- [ ] Compte Vercel créé
- [ ] Repository GitHub accessible
- [ ] Backend Azure déployé et fonctionnel

### Déploiement
- [ ] Repository connecté à Vercel
- [ ] Configuration du projet:
  - Root Directory: `./`
  - Output Directory: `frontend`
  - Build Command: (vide)
- [ ] Variables d'environnement configurées (optionnel)
- [ ] Déploiement lancé

### Configuration
- [ ] URL API mise à jour dans `frontend/js/api.js`
- [ ] CORS configuré sur Azure avec l'URL Vercel
- [ ] Code commité et pushé (redéploiement auto)

### Vérification
- [ ] Application accessible: `https://cocoatrack-xxxxx.vercel.app`
- [ ] Page de connexion s'affiche
- [ ] Connexion à l'API fonctionne
- [ ] PWA installable (icône + dans la barre d'adresse)
- [ ] Service Worker actif (DevTools > Application)

### URLs à noter
```
Frontend URL: https://cocoatrack-xxxxx.vercel.app
```

## 🔐 Sécurité

- [ ] SECRET_KEY généré avec `openssl rand -hex 32`
- [ ] Mot de passe base de données fort
- [ ] CORS configuré avec les bonnes origines (pas `*` en production)
- [ ] Variables sensibles dans Azure App Settings (pas dans le code)
- [ ] `.env` dans `.gitignore`

## 🧪 Tests Post-Déploiement

### Authentification
- [ ] Créer un compte
- [ ] Se connecter
- [ ] Se déconnecter
- [ ] Refresh token fonctionne

### Planteurs
- [ ] Créer un planteur
- [ ] Modifier un planteur
- [ ] Voir la liste des planteurs
- [ ] Supprimer un planteur

### Fournisseurs
- [ ] Créer un fournisseur
- [ ] Modifier un fournisseur
- [ ] Voir la liste des fournisseurs
- [ ] Assigner des planteurs

### Livraisons
- [ ] Créer une livraison
- [ ] Modifier une livraison
- [ ] Voir la liste des livraisons
- [ ] Filtrer les livraisons

### Collectes
- [ ] Créer une collecte
- [ ] Modifier une collecte
- [ ] Voir la liste des collectes
- [ ] Calcul des pertes correct

### Analytics
- [ ] Synthèse par planteur
- [ ] Synthèse par zone
- [ ] Synthèse par qualité
- [ ] Synthèse par fournisseur
- [ ] Graphiques s'affichent

### Exports
- [ ] Export Excel fonctionne
- [ ] Export PDF fonctionne
- [ ] Données correctes dans les exports

### Notifications
- [ ] Notifications s'affichent
- [ ] Marquer comme lu fonctionne
- [ ] Notifications temps réel (SSE)

### Coopératives
- [ ] Liste des coopératives
- [ ] Détails d'une coopérative
- [ ] Autocomplétion dans les formulaires

### PWA
- [ ] Installation sur desktop
- [ ] Installation sur mobile
- [ ] Mode offline fonctionne
- [ ] Synchronisation automatique

## 📊 Monitoring

### Azure
- [ ] Activer Application Insights
- [ ] Configurer les alertes
- [ ] Vérifier les métriques

### Vercel
- [ ] Activer Analytics
- [ ] Vérifier les logs de déploiement
- [ ] Configurer les alertes

## 📝 Documentation

- [ ] README.md mis à jour avec les URLs de production
- [ ] DEPLOIEMENT.md créé avec les instructions détaillées
- [ ] Variables d'environnement documentées
- [ ] Credentials sauvegardés en lieu sûr

## 🔄 CI/CD (Optionnel)

- [ ] GitHub Actions configuré pour les tests
- [ ] Azure Pipelines configuré
- [ ] Déploiement automatique sur push
- [ ] Rollback automatique en cas d'erreur

## 💰 Coûts

- [ ] Vérifier les coûts Azure (environ 28€/mois)
- [ ] Vérifier les limites Vercel (gratuit OK pour ce projet)
- [ ] Configurer les alertes de budget Azure

## 🎉 Mise en Production

- [ ] Tous les tests passent
- [ ] Performance acceptable
- [ ] Pas d'erreurs dans les logs
- [ ] Backup base de données configuré
- [ ] Plan de rollback prêt

## 📞 Support

- [ ] Documentation utilisateur créée
- [ ] Contacts support définis
- [ ] Procédure d'escalade documentée

---

## 🚨 En cas de problème

### Backend ne démarre pas
1. Vérifier les logs: `az webapp log tail --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX`
2. Vérifier les variables d'environnement
3. Vérifier la connexion base de données
4. Redémarrer: `az webapp restart --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX`

### Frontend ne se connecte pas
1. Vérifier l'URL API dans `api.js`
2. Vérifier CORS sur Azure
3. Vérifier les logs Vercel
4. Vider le cache du navigateur

### Base de données inaccessible
1. Vérifier le firewall PostgreSQL
2. Vérifier la chaîne de connexion
3. Vérifier que le serveur est démarré
4. Tester la connexion: `psql -h server.postgres.database.azure.com -U adminuser -d cocoatrack`

### Migrations échouent
1. Se connecter en SSH: `az webapp ssh --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX`
2. Vérifier alembic: `alembic current`
3. Appliquer manuellement: `alembic upgrade head`
4. Vérifier les logs: `cat /home/LogFiles/application.log`

---

## 📚 Ressources

- [Documentation Azure App Service](https://docs.microsoft.com/azure/app-service/)
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)

---

**Date de déploiement**: _______________

**Déployé par**: _______________

**Version**: 1.0.0
