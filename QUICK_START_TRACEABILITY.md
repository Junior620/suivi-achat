# 🚀 Quick Start - Traçabilité

## En 3 Commandes

```bash
# 1. Appliquer la migration
python apply_migration_016.py

# 2. Générer la traçabilité
python generate_traceability_existing.py

# 3. Tester
python test_traceability.py
```

## Utilisation

### 1️⃣ Créer une Livraison

Aller dans **Livraisons** > **Nouvelle Livraison**

➡️ Un QR code est généré automatiquement

### 2️⃣ Scanner un QR Code

Aller dans **🔗 Traçabilité** > **Scanner QR Code**

📷 Utiliser la caméra ou saisir manuellement

### 3️⃣ Voir la Timeline

Après scan, cliquer sur **📅 Voir la Timeline**

📊 Visualiser tous les événements

### 4️⃣ Enregistrer un Scan

Cliquer sur **📝 Enregistrer un Scan**

✍️ Remplir: Qui, Où, Type, Notes

### 5️⃣ Télécharger le QR Code

Cliquer sur **📥 Télécharger QR Code**

🖨️ Imprimer et coller sur les sacs

## API Rapide

```bash
# Vérifier un QR code (public)
curl https://api.example.com/api/v1/traceability/verify/COCOA-xxxxx-xxxxx

# Statistiques
curl https://api.example.com/api/v1/traceability/stats \
  -H "Authorization: Bearer $TOKEN"

# Vérifier la blockchain
curl https://api.example.com/api/v1/traceability/blockchain/verify \
  -H "Authorization: Bearer $TOKEN"
```

## Impression des QR Codes

```bash
# Générer un PDF avec tous les QR codes
python print_qr_codes.py

# Résultat: qr_codes_impression.pdf
# Format: 3x4 QR codes par page A4
```

## Dépannage Express

### QR code non généré?
```bash
python generate_traceability_existing.py
```

### Scanner ne marche pas?
- Vérifier HTTPS
- Utiliser saisie manuelle

### Blockchain compromise?
```bash
python test_traceability.py
```

## Fichiers Importants

- `TRACEABILITY_README.md` - Documentation complète
- `DEPLOIEMENT_TRACEABILITY.md` - Guide de déploiement
- `DEPLOY_TRACEABILITY_CHECKLIST.md` - Checklist complète

## Support

Questions? Voir la documentation complète ou contacter l'équipe technique.

---

**C'est tout! Vous êtes prêt à tracer vos livraisons! 🎉**
