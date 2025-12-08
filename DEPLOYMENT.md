# Guide de Déploiement en Production

## Prérequis

- Serveur avec Docker et Docker Compose installés
- Nom de domaine configuré
- Certificat SSL (Let's Encrypt recommandé)
- PostgreSQL 15+

## Variables d'Environnement

Créer un fichier `.env` à la racine avec:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
POSTGRES_USER=cocoatrack
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=cocoatrack

# JWT
JWT_SECRET=CHANGE_THIS_SECRET_KEY_MINIMUM_32_CHARACTERS
SECRET_KEY=CHANGE_THIS_SECRET_KEY_MINIMUM_32_CHARACTERS
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@cocoatrack.com

# VAPID Keys pour push notifications (optionnel)
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@cocoatrack.com
```

## Étapes de Déploiement

### 1. Cloner le Repository

```bash
git clone https://github.com/Junior620/suivi-achat.git
cd suivi-achat
```

### 2. Configuration

```bash
# Copier et modifier les variables d'environnement
cp .env.example .env
nano .env  # Modifier avec vos valeurs
```

### 3. Lancer avec Docker Compose

```bash
# Build et démarrage
docker-compose up -d --build

# Vérifier les logs
docker-compose logs -f
```

### 4. Initialiser la Base de Données

```bash
# Créer les tables
docker exec cocoa_backend python backend/init_db.py

# Créer un utilisateur admin
docker exec -it cocoa_db psql -U cocoatrack -d cocoatrack
```

SQL pour créer un admin:
```sql
INSERT INTO users (id, email, password, name, role, is_active)
VALUES (
    gen_random_uuid(),
    'admin@cocoatrack.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q0OXm', -- password: admin123
    'Administrateur',
    'admin',
    true
);
```

### 5. Configuration Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        root /path/to/suivi-achat/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

### 6. Sauvegardes Automatiques

Créer un script de sauvegarde:

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup PostgreSQL
docker exec cocoa_db pg_dump -U cocoatrack cocoatrack > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz backend/uploads/

# Garder seulement les 7 derniers jours
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete
```

Ajouter au crontab:
```bash
0 2 * * * /path/to/backup.sh
```

## Monitoring

### Logs

```bash
# Backend logs
docker logs cocoa_backend -f

# Database logs
docker logs cocoa_db -f

# Tous les logs
docker-compose logs -f
```

### Santé du Système

```bash
# Vérifier les conteneurs
docker-compose ps

# Utilisation des ressources
docker stats
```

## Mise à Jour

```bash
# Récupérer les dernières modifications
git pull origin main

# Rebuild et redémarrage
docker-compose down
docker-compose up -d --build

# Vérifier les logs
docker-compose logs -f
```

## Sécurité

### Checklist

- [ ] Changer tous les mots de passe par défaut
- [ ] Utiliser des secrets forts (32+ caractères)
- [ ] Activer HTTPS avec certificat SSL
- [ ] Configurer le firewall (ports 80, 443, 22 uniquement)
- [ ] Activer les sauvegardes automatiques
- [ ] Limiter l'accès SSH par clé uniquement
- [ ] Mettre à jour régulièrement le système
- [ ] Surveiller les logs d'audit

## Troubleshooting

### Backend ne démarre pas

```bash
# Vérifier les logs
docker logs cocoa_backend

# Vérifier la connexion DB
docker exec cocoa_backend python -c "from app.database import engine; print(engine.connect())"
```

### Base de données inaccessible

```bash
# Vérifier que PostgreSQL est démarré
docker ps | grep cocoa_db

# Tester la connexion
docker exec cocoa_db psql -U cocoatrack -d cocoatrack -c "SELECT 1;"
```

### WebSocket ne fonctionne pas

- Vérifier la configuration Nginx pour le proxy WebSocket
- S'assurer que le port 8000 est accessible
- Vérifier les logs backend pour les erreurs WebSocket

## Support

Pour toute question ou problème:
- Email: admin@cocoatrack.com
- GitHub Issues: https://github.com/Junior620/suivi-achat/issues
