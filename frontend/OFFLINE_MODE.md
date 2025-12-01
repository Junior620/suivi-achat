# Mode Offline - CocoaTrack

## 📱 Fonctionnalités

Le mode offline de CocoaTrack permet de continuer à utiliser l'application même sans connexion internet.

### ✅ Ce qui fonctionne en mode offline :

1. **Consultation des données en cache**
   - Liste des planteurs
   - Liste des fournisseurs (chefs planteurs)
   - Liste des coopératives

2. **Création de livraisons**
   - Créer de nouvelles livraisons
   - Les données sont sauvegardées localement
   - Synchronisation automatique au retour en ligne

3. **Indicateurs visuels**
   - Badge de statut réseau (🟢 En ligne / 🔴 Hors ligne)
   - Badge de synchronisation (nombre d'actions en attente)
   - Indicateur "⏳ Offline" sur les livraisons non synchronisées

## 🔄 Synchronisation

### Automatique
- Dès que la connexion est rétablie, les données sont synchronisées automatiquement
- Un toast de notification vous informe du processus

### Manuelle
- Cliquez sur le bouton 🔄 dans le header pour forcer la synchronisation
- Utile si la synchronisation automatique échoue

## 💾 Stockage local

Les données sont stockées dans IndexedDB avec les stores suivants :

- `planters` : Cache des planteurs
- `chef_planters` : Cache des fournisseurs
- `cooperatives` : Cache des coopératives
- `offline_deliveries` : Livraisons créées en mode offline
- `pending_sync` : File d'attente des actions à synchroniser

## 🔒 Sécurité

- Les données sont stockées localement sur votre appareil
- Le cache est rafraîchi automatiquement toutes les 24h
- Les tokens d'authentification restent sécurisés

## 📊 Limitations

En mode offline, vous ne pouvez pas :
- Modifier ou supprimer des livraisons existantes
- Créer de nouveaux planteurs ou fournisseurs
- Accéder aux statistiques en temps réel
- Exporter des données (Excel/PDF)

Ces fonctionnalités nécessitent une connexion internet active.

## 🛠️ Dépannage

### Les données ne se synchronisent pas ?
1. Vérifiez votre connexion internet
2. Cliquez sur le bouton 🔄 pour forcer la synchronisation
3. Rechargez la page si le problème persiste

### Le cache est vide ?
- Connectez-vous en ligne au moins une fois pour initialiser le cache
- Le cache se rafraîchit automatiquement toutes les 24h

### Livraisons en double ?
- Si une livraison offline est synchronisée, elle disparaît de la liste offline
- Rechargez la page pour voir les données à jour
