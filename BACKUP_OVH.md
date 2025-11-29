# Guide Backup OVH - CocoaTrack

## Options de Backup avec OVH

### Option 1 : Backup Automatique OVH (Payant)
**Prix** : 2.00 €/mois (~2.17 $/mois / ~1 302 FCFA/mois)

**Fonctionnement** :
- 7 snapshots automatiques conservés
- 1 backup par jour (entre 00h-06h)
- Rotation automatique
- Restauration en 1 clic
- Temps de restauration : 5-15 minutes

**Activation** :
1. Aller dans l'espace client OVH
2. Sélectionner ton VPS
3. Onglet "Backup automatique"
4. Cliquer "Activer"
5. Payer 2 €/mois

**Avantages** :
✅ Automatique (zéro maintenance)
✅ Backup complet du serveur
✅ Restauration ultra-rapide
✅ Fiable

**Inconvénients** :
❌ Payant (2 €/mois)
❌ Seulement 7 jours d'historique

---

### Option 2 : Snapshot Manuel OVH (GRATUIT) ⭐

**Prix** : **0 €** (GRATUIT !)

**Fonctionnement** :
- Tu crées un snapshot quand tu veux
- **1 snapshot gratuit** à la fois
- Conservé tant que tu ne le supprimes pas
- Restauration en 1 clic
- Temps de restauration : 5-15 minutes

**Comment créer un snapshot manuel** :

#### Via l'Interface Web OVH
1. Connexion sur ovh.com
2. Aller dans "Bare Metal Cloud" → "VPS"
3. Sélectionner ton VPS
4. Onglet "Snapshot"
5. Cliquer "Créer un snapshot"
6. Attendre 5-10 minutes
7. Snapshot créé !

#### Via l'API OVH
```bash
# Installer ovh-cli
pip install ovh

# Créer un snapshot
ovh-eu vps POST /vps/{serviceName}/createSnapshot
```

**Limites** :
⚠️ **1 seul snapshot gratuit** à la fois
⚠️ Si tu en crées un nouveau, l'ancien est supprimé
⚠️ Snapshot = image complète du serveur (peut être gros)

**Avantages** :
✅ **Totalement gratuit**
✅ Backup complet du serveur
✅ Restauration rapide
✅ Conservé indéfiniment

**Inconvénients** :
❌ Manuel (tu dois penser à le faire)
❌ 1 seul snapshot à la fois
❌ Pas d'historique multiple

**Quand créer un snapshot** :
- Avant une mise à jour importante
- Avant une modification de configuration
- Une fois par semaine manuellement
- Avant d'installer un nouveau logiciel

---

### Option 3 : Backup PostgreSQL Manuel (GRATUIT)

**Prix** : **0 €** (GRATUIT !)

**Script de backup** (`/root/backup-postgres.sh`) :
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="cocoatrack"

# Créer le dossier
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Garder seulement les 30 derniers backups
ls -t $BACKUP_DIR/backup_*.sql.gz | tail -n +31 | xargs rm -f

echo "✅ Backup créé : backup_$DATE.sql.gz"
```

**Rendre exécutable** :
```bash
chmod +x /root/backup-postgres.sh
```

**Automatiser avec cron** (tous les jours à 2h) :
```bash
crontab -e
```

Ajouter :
```
0 2 * * * /root/backup-postgres.sh >> /var/log/backup.log 2>&1
```

**Avantages** :
✅ **Gratuit**
✅ 30 jours d'historique
✅ Backup uniquement de la base (léger)
✅ Automatique via cron

**Inconvénients** :
❌ Backup local (si serveur meurt, backup perdu)
❌ Pas de backup de l'OS

---

### Option 4 : Backup vers OVH Object Storage (Économique)

**Prix** : 0.01 €/GB/mois (~0.011 $/GB)

**OVH Object Storage** (équivalent AWS S3) :
- Stockage cloud OVH
- Très bon marché
- Accès depuis n'importe où
- Compatible S3

**Prix estimé pour CocoaTrack** :
- Base de données : ~500 MB compressée
- 30 backups : 15 GB
- Coût : 15 GB × 0.01 € = **0.15 €/mois** (~0.16 $ / ~96 FCFA/mois)

**Configuration** :

#### 1. Créer un conteneur Object Storage
1. Espace client OVH
2. "Public Cloud" → "Object Storage"
3. Créer un conteneur "cocoatrack-backups"
4. Région : GRA (Gravelines, France)
5. Type : Standard

#### 2. Installer rclone
```bash
curl https://rclone.org/install.sh | sudo bash
```

#### 3. Configurer rclone pour OVH
```bash
rclone config

# Choisir : Swift (OpenStack)
# Auth URL : https://auth.cloud.ovh.net/v3
# User : ton_user_openstack
# Key : ton_password_openstack
# Region : GRA
# Storage URL : laisser vide
```

#### 4. Script de backup vers Object Storage
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
TEMP_DIR="/tmp/backup"
DB_NAME="cocoatrack"

# Créer backup temporaire
mkdir -p $TEMP_DIR
docker exec postgres pg_dump -U postgres $DB_NAME | gzip > $TEMP_DIR/backup_$DATE.sql.gz

# Envoyer vers OVH Object Storage
rclone copy $TEMP_DIR/backup_$DATE.sql.gz ovh:cocoatrack-backups/

# Nettoyer local
rm -rf $TEMP_DIR

# Garder seulement 90 jours sur Object Storage
rclone delete ovh:cocoatrack-backups/ --min-age 90d

echo "✅ Backup envoyé vers OVH Object Storage"
```

**Avantages** :
✅ Très économique (0.15 €/mois)
✅ Backup hors serveur (sécurité maximale)
✅ 90 jours d'historique
✅ Accès depuis n'importe où

**Inconvénients** :
❌ Configuration plus complexe
❌ Coût supplémentaire (minime)

---

## Ma Recommandation pour CocoaTrack

### Solution Optimale : Snapshot Manuel + Backup PostgreSQL

**Configuration** :

#### 1. Snapshot Manuel OVH (Gratuit)
- Créer un snapshot **1 fois par semaine** (dimanche soir)
- Backup complet du serveur
- Restauration rapide en cas de gros problème

#### 2. Backup PostgreSQL Automatique (Gratuit)
- Script cron tous les jours à 2h
- 30 jours d'historique
- Restauration sélective de la base

**Coût total : 0 €/mois** (100% GRATUIT !)

**Avantages** :
✅ Double sécurité (serveur + base)
✅ Historique court (1 snapshot) et long (30 backups DB)
✅ Restauration rapide ou sélective
✅ **Totalement gratuit**

---

## Comparaison des Options OVH

| Option | Coût/mois | Historique | Sécurité | Facilité | Recommandé |
|--------|-----------|------------|----------|----------|------------|
| Backup Auto OVH | 2.00 € | 7 jours | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Snapshot Manuel** | **0 €** | **1 snapshot** | **⭐⭐⭐** | **⭐⭐⭐⭐⭐** | **⭐⭐⭐⭐⭐** |
| PostgreSQL Local | 0 € | 30 jours | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Snapshot + PostgreSQL** | **0 €** | **1 + 30 jours** | **⭐⭐⭐⭐** | **⭐⭐⭐⭐** | **⭐⭐⭐⭐⭐** |
| Object Storage | 0.15 € | 90 jours | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Procédure de Backup Hebdomadaire (Gratuite)

### Chaque Dimanche Soir

**1. Créer un snapshot OVH** (5 minutes)
```bash
# Via interface web OVH
1. Connexion ovh.com
2. VPS → Snapshot
3. Créer un snapshot
4. Attendre 5-10 minutes
```

**2. Vérifier les backups PostgreSQL** (1 minute)
```bash
# Se connecter au VPS
ssh root@ton-vps

# Vérifier les backups
ls -lh /backups/postgres/

# Vérifier le dernier backup
ls -t /backups/postgres/backup_*.sql.gz | head -1
```

**Temps total : 6 minutes par semaine**

---

## Restauration

### Restaurer depuis Snapshot OVH

**Via Interface Web** :
1. Espace client OVH
2. VPS → Snapshot
3. Cliquer "Restaurer"
4. Confirmer
5. Attendre 5-15 minutes
6. Serveur restauré !

**⚠️ Attention** : Restaurer un snapshot écrase tout le serveur

### Restaurer depuis Backup PostgreSQL

```bash
# Lister les backups disponibles
ls -lh /backups/postgres/

# Choisir un backup
BACKUP_FILE="backup_20251121_020000.sql.gz"

# Décompresser
gunzip /backups/postgres/$BACKUP_FILE

# Restaurer dans PostgreSQL
docker exec -i postgres psql -U postgres cocoatrack < /backups/postgres/backup_20251121_020000.sql

# Recompresser
gzip /backups/postgres/backup_20251121_020000.sql
```

---

## Budget Total avec OVH

### Configuration Économique (Recommandée)
- VPS OVH Starter : 7.00 €/mois
- Snapshot manuel : 0 € (gratuit)
- Backup PostgreSQL : 0 € (gratuit)
- Domaine .com : 9.99 €/an

**Total Année 1** : 93.99 € (~101.80 $ / ~61 080 FCFA)
**Coût mensuel** : 7.83 €/mois (~8.48 $ / ~5 088 FCFA/mois)

### Configuration Confort
- VPS OVH Starter : 7.00 €/mois
- Backup automatique OVH : 2.00 €/mois
- Domaine .com : 9.99 €/an

**Total Année 1** : 117.99 € (~127.80 $ / ~76 680 FCFA)
**Coût mensuel** : 9.83 €/mois (~10.65 $ / ~6 390 FCFA/mois)

### Configuration Premium
- VPS OVH Starter : 7.00 €/mois
- Backup automatique OVH : 2.00 €/mois
- Object Storage : 0.15 €/mois
- Domaine .com : 9.99 €/an

**Total Année 1** : 119.79 € (~129.75 $ / ~77 850 FCFA)
**Coût mensuel** : 9.98 €/mois (~10.81 $ / ~6 486 FCFA/mois)

---

## Mon Conseil Final

**Pour CocoaTrack au Cameroun avec OVH** :

### 🏆 Configuration Recommandée (Économique)
- VPS OVH Starter : 7.00 €/mois
- **Snapshot manuel** : 0 € (1 fois/semaine)
- **Backup PostgreSQL** : 0 € (automatique quotidien)
- Domaine .com : 9.99 €/an

**Total : 7.83 €/mois (~5 088 FCFA/mois)**

**Pourquoi cette config** :
✅ **100% gratuit pour les backups**
✅ Double sécurité (snapshot + base)
✅ Historique suffisant (1 snapshot + 30 backups DB)
✅ Très économique

**Si tu veux plus de confort** :
- Ajouter Backup automatique OVH (+2 €/mois)
- Total : 9.83 €/mois (~6 390 FCFA/mois)

---

**Date** : Novembre 2025
**Projet** : CocoaTrack - Gestion des livraisons de cacao
