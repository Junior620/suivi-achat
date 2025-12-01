# 🔗 Système de Traçabilité Blockchain avec QR Codes

## Vue Rapide

Un système complet de traçabilité pour les livraisons de cacao avec:
- ✅ QR codes uniques générés automatiquement
- ✅ Blockchain SHA-256 pour garantir l'intégrité
- ✅ Scanner mobile (caméra ou saisie manuelle)
- ✅ Historique complet des scans
- ✅ Timeline de traçabilité
- ✅ Géolocalisation optionnelle
- ✅ Vérification d'authenticité

## 🚀 Démarrage Rapide

### 1. Appliquer la Migration

```bash
python apply_migration_016.py
```

### 2. Générer la Traçabilité pour les Livraisons Existantes

```bash
python generate_traceability_existing.py
```

### 3. Accéder au Module

1. Se connecter à l'application
2. Cliquer sur "🔗 Traçabilité" dans le menu
3. Commencer à scanner ou rechercher

## 📱 Fonctionnalités

### Scanner QR Code
- Utiliser la caméra du téléphone/ordinateur
- Ou saisir le code manuellement
- Vérification instantanée de l'authenticité

### Rechercher une Livraison
- Par ID de livraison
- Par code QR
- Voir toutes les informations

### Timeline de Traçabilité
- Création de la livraison
- Tous les scans effectués
- Qui, quand, où

### Enregistrer un Scan
- Type de scan (vérification, transfert, contrôle qualité, etc.)
- Lieu du scan
- Notes optionnelles
- Géolocalisation automatique

### Statistiques Blockchain
- Nombre de livraisons tracées
- Total des scans
- Moyenne de scans par livraison
- État de la blockchain

### Vérifier l'Intégrité
- Vérification complète de la blockchain
- Détection de toute altération
- Garantie d'authenticité

## 🔐 Comment ça Marche

### 1. Création d'une Livraison

Quand une livraison est créée:
1. Un QR code unique est généré: `COCOA-{uuid}-{hash}`
2. Un hash blockchain SHA-256 est calculé
3. Le bloc est ajouté à la chaîne (référence au bloc précédent)
4. Les données sont enregistrées de manière immuable

### 2. Scan d'un QR Code

Quand un QR code est scanné:
1. Le système vérifie l'existence dans la blockchain
2. Recalcule le hash pour vérifier l'intégrité
3. Affiche toutes les informations de la livraison
4. Enregistre le scan dans l'historique

### 3. Blockchain

Chaque bloc contient:
- **Numéro de bloc**: Position dans la chaîne
- **Hash actuel**: SHA-256 des données
- **Hash précédent**: Lien avec le bloc précédent
- **Données**: Informations complètes de la livraison
- **Timestamp**: Date et heure de création

### 4. Vérification d'Intégrité

Pour vérifier la blockchain:
1. Parcourir tous les blocs
2. Recalculer chaque hash
3. Vérifier le chaînage (previous_hash)
4. Détecter toute modification

## 📊 Structure des Données

### TraceabilityRecord
```json
{
  "id": "uuid",
  "delivery_id": "uuid",
  "qr_code": "COCOA-xxxxx-xxxxx",
  "qr_code_image": "data:image/png;base64,...",
  "blockchain_hash": "sha256...",
  "previous_hash": "sha256...",
  "block_number": 123,
  "trace_data": {
    "delivery_id": "...",
    "planter_name": "...",
    "date": "2025-12-01",
    "quantity_kg": 100,
    "quality": "Grade 1",
    "load_location": "Abidjan",
    "unload_location": "Port"
  },
  "created_at": "2025-12-01T10:00:00",
  "scans": [...]
}
```

### TraceabilityScan
```json
{
  "id": "uuid",
  "record_id": "uuid",
  "scanned_by": "Jean Dupont",
  "scan_location": "Entrepôt A",
  "scan_type": "verification",
  "notes": "Contrôle qualité OK",
  "latitude": "5.3600",
  "longitude": "-4.0083",
  "scanned_at": "2025-12-01T14:30:00"
}
```

## 🎯 Cas d'Usage

### 1. Vérification d'Authenticité
Un acheteur scanne le QR code pour vérifier que la livraison est authentique et n'a pas été altérée.

### 2. Suivi de Parcours
Enregistrer chaque étape du parcours de la livraison (chargement, transit, déchargement, stockage).

### 3. Contrôle Qualité
Scanner lors des contrôles qualité et enregistrer les résultats.

### 4. Audit et Conformité
Prouver la traçabilité complète pour les certifications et audits.

### 5. Transparence Client
Permettre aux clients finaux de voir l'origine et le parcours du cacao.

## 🔧 API Endpoints

```bash
# Obtenir la traçabilité d'une livraison
GET /api/v1/traceability/delivery/{delivery_id}

# Vérifier un QR code (public, pas d'auth)
GET /api/v1/traceability/verify/{qr_code}

# Enregistrer un scan
POST /api/v1/traceability/scan/{qr_code}
{
  "scanned_by": "Jean Dupont",
  "scan_type": "verification",
  "scan_location": "Entrepôt A",
  "notes": "OK",
  "latitude": "5.3600",
  "longitude": "-4.0083"
}

# Timeline d'une livraison
GET /api/v1/traceability/timeline/{delivery_id}

# Vérifier l'intégrité de la blockchain
GET /api/v1/traceability/blockchain/verify

# Statistiques
GET /api/v1/traceability/stats
```

## 📱 Interface Utilisateur

### Onglet Scanner
- Zone de scan avec caméra
- Saisie manuelle en fallback
- Résultat de vérification en temps réel

### Onglet Rechercher
- Recherche par ID ou QR code
- Affichage des informations complètes

### Onglet Timeline
- Visualisation chronologique
- Tous les événements
- Informations détaillées

## 🎨 Design

- Interface moderne et intuitive
- Responsive (mobile et desktop)
- Animations fluides
- Codes couleur pour les statuts
- Icons pour une meilleure UX

## 🔒 Sécurité

### Blockchain
- Hash SHA-256 cryptographiquement sécurisé
- Chaînage des blocs pour détecter les modifications
- Immuabilité garantie

### QR Codes
- Format unique et non devinable
- Contient le hash blockchain
- Vérifiable publiquement

### Scans
- Authentification JWT requise
- Traçabilité de qui scanne
- Géolocalisation pour prouver la position

## 📈 Avantages

1. **Transparence**: Traçabilité complète du producteur au consommateur
2. **Confiance**: Blockchain garantit l'authenticité
3. **Efficacité**: Scan rapide avec smartphone
4. **Conformité**: Preuves pour audits et certifications
5. **Marketing**: Valorisation de la qualité et de l'origine

## 🚀 Évolutions Futures

- [ ] Application mobile dédiée
- [ ] Mode offline avec synchronisation
- [ ] Impression automatique des QR codes
- [ ] Widget de vérification pour site web
- [ ] Analytics avancés (parcours, temps de transit)
- [ ] Intégration avec systèmes externes
- [ ] Notifications automatiques lors des scans
- [ ] Rapports de traçabilité PDF

## 📞 Support

Pour toute question ou problème:
1. Consulter `DEPLOIEMENT_TRACEABILITY.md`
2. Vérifier les logs de l'application
3. Tester l'API directement
4. Contacter l'équipe technique

---

**Développé avec ❤️ pour la traçabilité du cacao**
