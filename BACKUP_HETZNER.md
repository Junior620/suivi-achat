# Guide Backup Automatique - Hetzner VPS CX21

## Option 1 : Backup Hetzner (Recommandé)

### Activation
- Dans le panneau Hetzner, activer "Backups"
- Coût : **20% du prix du serveur**
- Pour CX21 : 6.30 $ × 20% = **1.26 $/mois** (~756 FCFA/mois)

### Fonctionnement
- **7 snapshots automatiques** conservés
- Fréquence : 1 backup par jour (entre 22h-6h)
- Rotation automatique : le plus ancien est supprimé
- Restauration en 1 clic depuis le panneau
- Temps de restauration : 5-10 minutes

### Avantages
✅ Automatique (zéro maintenance)
✅ Backup complet du serveur (OS + données)
✅ Restauration ultra-rapide
✅ Fiable et testé
✅ Pas de configuration nécessaire

### Inconvénients
❌ Seulement 7 jours d'historique
❌ Pas de backup hors Hetzner (même datacenter)

**Coût total : 7.56 $/mois** (~4 536 FCFA/mois)

---

## Option 2 : Backup PostgreSQL Automatique (Gratuit)

### Configuration avec pg_dump + cron

**Script de backup** (`/root/backup-postgres.sh`) :
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="cocoatrack"

# Créer le dossier si nécessaire
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Garder seulement les 30 derniers backups
ls -t $BACKUP_DIR/backup_*.sql.gz | tail -n +31 | xargs rm -f

# Afficher la taille
du -h $BACKUP_DIR/backup_$DATE.sql.gz
```

**Rendre exécutable** :
```bash
chmod +x /root/backup-postgres.sh
```

**Automatiser avec cron** (tous les jours à 2h du matin) :
```bash
crontab -e
```

Ajouter :
```
0 2 * * * /root/backup-postgres.sh >> /var/log/backup.log 2>&1
```

### Avantages
✅ Gratuit
✅ 30 jours d'historique
✅ Backup uniquement de la base de données (plus léger)
✅ Contrôle total

### Inconvénients
❌ Configuration manuelle
❌ Backup local (si le serveur meurt, backup perdu)
❌ Pas de backup de l'OS

**Coût : 0 $/mois**

---

## Option 3 : Backup Externe (Hetzner Storage Box)

### Hetzner Storage Box
- **BX11** : 100 GB pour 3.81 €/mois (~4.13 $/mois)
- Accès SSH/SFTP/WebDAV
- Serveur séparé (sécurité maximale)

### Script de backup vers Storage Box

**Configuration** :
```bash
# Installer rclone
curl https://rclone.org/install.sh | sudo bash

# Configurer rclone pour Storage Box
rclone config
# Choisir : SFTP
# Host : uXXXXXX.your-storagebox.de
# User : uXXXXXX
# Password : ton_mot_de_passe
```

**Script** (`/root/backup-external.sh`) :
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
TEMP_DIR="/tmp/backup"
DB_NAME="cocoatrack"

# Créer backup temporaire
mkdir -p $TEMP_DIR
docker exec postgres pg_dump -U postgres $DB_NAME | gzip > $TEMP_DIR/backup_$DATE.sql.gz

# Envoyer vers Storage Box
rclone copy $TEMP_DIR/backup_$DATE.sql.gz storagebox:cocoatrack-backups/

# Nettoyer
rm -rf $TEMP_DIR

# Garder seulement 90 jours sur Storage Box
rclone delete storagebox:cocoatrack-backups/ --min-age 90d
```

**Automatiser** :
```bash
crontab -e
```

Ajouter :
```
0 3 * * * /root/backup-external.sh >> /var/log/backup-external.log 2>&1
```

### Avantages
✅ Backup hors serveur (sécurité maximale)
✅ 90 jours d'historique
✅ 100 GB d'espace
✅ Accès depuis n'importe où

### Inconvénients
❌ Coût supplémentaire (4.13 $/mois)
❌ Configuration plus complexe

**Coût total : 10.43 $/mois** (~6 258 FCFA/mois)

---

## Option 4 : Backup vers Cloud (AWS S3 / Google Drive)

### Backup vers AWS S3

**Installation** :
```bash
apt-get install awscli
aws configure
```

**Script** (`/root/backup-s3.sh`) :
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
TEMP_DIR="/tmp/backup"
DB_NAME="cocoatrack"
S3_BUCKET="s3://cocoatrack-backups"

# Créer backup
mkdir -p $TEMP_DIR
docker exec postgres pg_dump -U postgres $DB_NAME | gzip > $TEMP_DIR/backup_$DATE.sql.gz

# Envoyer vers S3
aws s3 cp $TEMP_DIR/backup_$DATE.sql.gz $S3_BUCKET/

# Nettoyer local
rm -rf $TEMP_DIR

# Supprimer backups > 90 jours sur S3
aws s3 ls $S3_BUCKET/ | while read -r line; do
    createDate=$(echo $line | awk '{print $1" "$2}')
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "90 days ago" +%s)
    if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo $line | awk '{print $4}')
        aws s3 rm $S3_BUCKET/$fileName
    fi
done
```

**Coût AWS S3** :
- Stockage : 0.023 $/GB/mois
- Pour 10 GB de backups : 0.23 $/mois
- Transfert sortant : gratuit (< 100 GB/mois)

**Coût total : 6.53 $/mois** (~3 918 FCFA/mois)

---

## Ma Recommandation pour CocoaTrack

### Solution Optimale : Backup Hetzner + Backup PostgreSQL Local

**Configuration** :
1. **Activer Backup Hetzner** (1.26 $/mois)
   - Backup complet du serveur
   - 7 jours d'historique
   - Restauration rapide

2. **Script PostgreSQL automatique** (gratuit)
   - Backup quotidien de la base
   - 30 jours d'historique local
   - Sécurité supplémentaire

**Coût total : 7.56 $/mois** (~4 536 FCFA/mois)

**Avantages** :
✅ Double sécurité (serveur + base)
✅ Historique court (7j) et long (30j)
✅ Restauration rapide ou sélective
✅ Coût raisonnable

---

## Comparaison des Options

| Option | Coût/mois | Historique | Sécurité | Facilité |
|--------|-----------|------------|----------|----------|
| Backup Hetzner seul | 7.56 $ | 7 jours | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| PostgreSQL local | 0 $ | 30 jours | ⭐⭐ | ⭐⭐⭐ |
| **Hetzner + PostgreSQL** | **7.56 $** | **7-30 jours** | **⭐⭐⭐⭐** | **⭐⭐⭐⭐** |
| Storage Box | 10.43 $ | 90 jours | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| AWS S3 | 6.53 $ | 90 jours | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## Test de Restauration

### Restaurer depuis Backup Hetzner
1. Aller dans le panneau Hetzner
2. Cliquer sur "Backups"
3. Sélectionner le backup
4. Cliquer "Restore"
5. Attendre 5-10 minutes
6. Serveur restauré !

### Restaurer depuis Backup PostgreSQL
```bash
# Décompresser le backup
gunzip backup_20251121_020000.sql.gz

# Restaurer dans PostgreSQL
docker exec -i postgres psql -U postgres cocoatrack < backup_20251121_020000.sql
```

---

## Monitoring des Backups

### Script de vérification (`/root/check-backups.sh`)
```bash
#!/bin/bash

# Vérifier le dernier backup
LAST_BACKUP=$(ls -t /backups/postgres/backup_*.sql.gz | head -1)
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LAST_BACKUP")) / 3600 ))

if [ $BACKUP_AGE -gt 48 ]; then
    echo "⚠️ ALERTE : Dernier backup a plus de 48h !"
    # Envoyer email ou notification
else
    echo "✅ Backup OK : $LAST_BACKUP ($BACKUP_AGE heures)"
fi
```

**Automatiser la vérification** :
```bash
crontab -e
```

Ajouter :
```
0 12 * * * /root/check-backups.sh
```

---

## Conclusion

Pour **CocoaTrack sur Hetzner CX21**, je recommande :

**Configuration finale** :
- Hetzner VPS CX21 : 6.30 $/mois
- Backup Hetzner : 1.26 $/mois
- Script PostgreSQL : 0 $/mois (gratuit)

**Total : 7.56 $/mois (~4 536 FCFA/mois)**

C'est **3.6 fois moins cher** qu'AWS (27.09 $) avec des backups tout aussi fiables !

---

**Date** : Novembre 2025
**Projet** : CocoaTrack - Gestion des livraisons de cacao
