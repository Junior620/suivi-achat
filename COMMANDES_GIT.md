# 📝 Commandes Git pour le Déploiement

## Initialisation du repository (première fois)

```bash
# Initialiser Git
git init

# Ajouter le remote GitHub
git remote add origin https://github.com/Junior620/suivi-achat.git

# Vérifier le remote
git remote -v

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Application CocoaTrack prête pour déploiement"

# Pousser sur GitHub
git push -u origin main
```

Si erreur "branch main doesn't exist":
```bash
git branch -M main
git push -u origin main
```

Si erreur "remote origin already exists":
```bash
git remote remove origin
git remote add origin https://github.com/Junior620/suivi-achat.git
```

---

## Workflow quotidien

### Voir les changements
```bash
git status
git diff
```

### Ajouter et commiter
```bash
# Ajouter tous les fichiers modifiés
git add .

# Ou ajouter des fichiers spécifiques
git add frontend/js/api.js
git add backend/app/main.py

# Commiter avec un message
git commit -m "Description des changements"
```

### Pousser sur GitHub
```bash
git push origin main
```

---

## Commandes utiles

### Voir l'historique
```bash
git log
git log --oneline
```

### Annuler des changements
```bash
# Annuler les modifications non commitées
git checkout -- fichier.txt

# Annuler le dernier commit (garde les changements)
git reset --soft HEAD~1

# Annuler le dernier commit (supprime les changements)
git reset --hard HEAD~1
```

### Branches
```bash
# Créer une branche
git branch dev

# Changer de branche
git checkout dev

# Créer et changer de branche
git checkout -b feature/nouvelle-fonctionnalite

# Fusionner une branche
git checkout main
git merge dev

# Supprimer une branche
git branch -d dev
```

### Synchroniser avec GitHub
```bash
# Récupérer les changements
git pull origin main

# Forcer le push (attention!)
git push -f origin main
```

---

## Workflow de déploiement

### 1. Développement local
```bash
# Créer une branche de développement
git checkout -b dev

# Faire vos modifications
# ...

# Commiter
git add .
git commit -m "Ajout de nouvelles fonctionnalités"

# Pousser la branche
git push origin dev
```

### 2. Test et validation
```bash
# Tester localement
# ...

# Si OK, fusionner dans main
git checkout main
git merge dev
```

### 3. Déploiement
```bash
# Pousser sur main
git push origin main

# Vercel redéploie automatiquement le frontend
# Pour le backend, redéployer sur Azure:
cd backend
az webapp up --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX
```

---

## Gestion des fichiers sensibles

### Vérifier que .env n'est pas tracké
```bash
git status

# Si .env apparaît, l'ajouter au .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"

# Supprimer .env du tracking (si déjà commité)
git rm --cached .env
git commit -m "Remove .env from tracking"
```

---

## Résolution de problèmes

### Conflit de merge
```bash
# Voir les fichiers en conflit
git status

# Éditer les fichiers pour résoudre les conflits
# Chercher les marqueurs: <<<<<<<, =======, >>>>>>>

# Marquer comme résolu
git add fichier-resolu.txt

# Terminer le merge
git commit
```

### Annuler un push (attention!)
```bash
# Revenir au commit précédent
git reset --hard HEAD~1

# Forcer le push
git push -f origin main
```

### Nettoyer le repository
```bash
# Supprimer les fichiers non trackés
git clean -fd

# Voir ce qui serait supprimé (sans supprimer)
git clean -fdn
```

---

## Tags pour les versions

### Créer un tag
```bash
# Tag simple
git tag v1.0.0

# Tag annoté (recommandé)
git tag -a v1.0.0 -m "Version 1.0.0 - Première version production"

# Pousser les tags
git push origin v1.0.0

# Pousser tous les tags
git push origin --tags
```

### Lister les tags
```bash
git tag
git tag -l "v1.*"
```

### Supprimer un tag
```bash
# Local
git tag -d v1.0.0

# Remote
git push origin :refs/tags/v1.0.0
```

---

## Bonnes pratiques

### Messages de commit
```bash
# ✅ Bon
git commit -m "Fix: Correction du calcul des pertes dans les collectes"
git commit -m "Feature: Ajout du système de notifications"
git commit -m "Refactor: Amélioration de la structure du code API"

# ❌ Mauvais
git commit -m "fix"
git commit -m "update"
git commit -m "changes"
```

### Préfixes recommandés
- `Feature:` - Nouvelle fonctionnalité
- `Fix:` - Correction de bug
- `Refactor:` - Refactoring du code
- `Style:` - Changements de style/CSS
- `Docs:` - Documentation
- `Test:` - Ajout de tests
- `Chore:` - Tâches de maintenance

---

## Commandes de vérification avant déploiement

```bash
# Vérifier qu'il n'y a pas de fichiers sensibles
git status

# Vérifier le .gitignore
cat .gitignore

# Vérifier les fichiers trackés
git ls-files

# Vérifier qu'il n'y a pas de .env
git ls-files | grep .env

# Vérifier la taille du repository
git count-objects -vH
```

---

## Aide-mémoire rapide

```bash
# Status
git status

# Ajouter
git add .

# Commiter
git commit -m "message"

# Pousser
git push origin main

# Tirer
git pull origin main

# Voir l'historique
git log --oneline

# Annuler changements
git checkout -- fichier

# Créer branche
git checkout -b nom-branche

# Changer branche
git checkout nom-branche

# Fusionner
git merge nom-branche
```

---

## 🆘 En cas de problème

### "fatal: not a git repository"
```bash
git init
git remote add origin https://github.com/Junior620/suivi-achat.git
```

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/Junior620/suivi-achat.git
```

### "failed to push some refs"
```bash
git pull origin main --rebase
git push origin main
```

### "Permission denied (publickey)"
```bash
# Configurer SSH ou utiliser HTTPS
git remote set-url origin https://github.com/Junior620/suivi-achat.git
```

---

## 📚 Ressources

- [Documentation Git](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
