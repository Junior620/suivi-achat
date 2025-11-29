# Dossier Images

Ce dossier contient les logos et icônes de l'application.

## Fichiers recommandés

### Logo principal
- `logo.png` - Logo principal de l'application (recommandé : 200x200px)
- `logo-white.png` - Version blanche du logo pour fond sombre

### Icônes
- `favicon.ico` - Icône du navigateur (16x16, 32x32, 48x48px)
- `icon-192.png` - Icône pour mobile (192x192px)
- `icon-512.png` - Icône haute résolution (512x512px)

### Images de fond
- `cacao-bg.jpg` - Image de fond pour la page de connexion (optionnel)

## Utilisation

Pour utiliser le logo dans l'application, ajoutez votre fichier `logo.png` dans ce dossier, puis mettez à jour le fichier `app.html` :

```html
<div class="sidebar-header">
    <img src="images/logo.png" alt="Logo" style="height: 40px; margin-right: 10px;">
    <h2>Cacao</h2>
</div>
```

Pour le favicon, ajoutez dans `<head>` de `index.html` et `app.html` :

```html
<link rel="icon" type="image/x-icon" href="images/favicon.ico">
```
