# Options d'Hébergement - CocoaTrack

## Architecture du Projet
- **Backend** : FastAPI (Python) + PostgreSQL
- **Frontend** : HTML/CSS/JavaScript (statique)
- **Conteneurisation** : Docker + Docker Compose

---

## Option 1 : Hébergement Cloud Économique

### Railway.app (Recommandé pour démarrer)
**Prix détaillé** :
- Plan Hobby : 5 $/mois (500 MB RAM, 1 GB stockage)
- Plan Pro : 20 $/mois (8 GB RAM, 100 GB stockage)
- PostgreSQL inclus dans le plan
- 500 heures gratuites/mois (plan Trial)

**Frontend** : Netlify (Gratuit)
- 100 GB bande passante/mois
- SSL automatique
- CDN mondial
- Déploiement automatique

**Total réel** : 
- Test : 0 $/mois (plan gratuit)
- Production : 5 $/mois (~3 000 FCFA/mois)

---

## Option 2 : VPS Classique

### DigitalOcean Droplet
**Prix détaillé** :
- Basic (1 vCPU, 1 GB RAM, 25 GB SSD) : 6 $/mois
- Basic (1 vCPU, 2 GB RAM, 50 GB SSD) : 12 $/mois
- Basic (2 vCPU, 2 GB RAM, 60 GB SSD) : 18 $/mois
- Backup automatique : +20% (1.20-3.60 $/mois)
- Bande passante : 1-2 TB inclus

**Total réel** : 6-18 $/mois (~3 600-10 800 FCFA/mois)

### Hetzner (Meilleur rapport qualité/prix)
**Prix détaillé** :
- CX11 (1 vCPU, 2 GB RAM, 20 GB SSD) : 4.15 €/mois (~4.50 $/mois)
- CX21 (2 vCPU, 4 GB RAM, 40 GB SSD) : 5.83 €/mois (~6.30 $/mois)
- CX31 (2 vCPU, 8 GB RAM, 80 GB SSD) : 10.59 €/mois (~11.50 $/mois)
- Backup : +20%
- Trafic : 20 TB inclus

**Total réel** : 4.50-11.50 $/mois (~2 700-6 900 FCFA/mois)

### Vultr
**Prix détaillé** :
- Regular (1 vCPU, 1 GB RAM, 25 GB SSD) : 6 $/mois
- Regular (1 vCPU, 2 GB RAM, 55 GB SSD) : 12 $/mois
- Backup : +1.20-2.40 $/mois

**Total réel** : 6-12 $/mois (~3 600-7 200 FCFA/mois)

---

## Option 3 : Hébergement Managé

### Render.com
**Prix détaillé** :
- Starter (Backend) : 7 $/mois (512 MB RAM)
- Standard (Backend) : 25 $/mois (2 GB RAM)
- PostgreSQL Starter : 7 $/mois (1 GB RAM, 1 GB stockage)
- PostgreSQL Standard : 20 $/mois (4 GB RAM, 10 GB stockage)
- Frontend statique : Gratuit (100 GB/mois)
- SSL inclus
- Déploiement automatique

**Total réel** : 
- Petit projet : 14 $/mois (~8 400 FCFA/mois)
- Projet moyen : 45 $/mois (~27 000 FCFA/mois)

### Heroku
**Prix détaillé** :
- Eco Dyno (Backend) : 5 $/mois (512 MB RAM)
- Basic Dyno : 7 $/mois (512 MB RAM, toujours actif)
- Standard 1X : 25 $/mois (512 MB RAM)
- Mini PostgreSQL : 5 $/mois (1 GB stockage, 20 connexions)
- Essential PostgreSQL : 50 $/mois (64 GB stockage, 120 connexions)
- SSL inclus

**Total réel** : 
- Petit projet : 10 $/mois (~6 000 FCFA/mois)
- Projet moyen : 75 $/mois (~45 000 FCFA/mois)

---

## Option 4 : Cloud Provider (Production)

### AWS (Amazon Web Services) - Détaillé

**⚠️ IMPORTANT** : Avec RDS PostgreSQL, voici les coûts RÉELS minimums

**Configuration Minimale avec RDS (Optimisée)** :
- EC2 t3.micro (2 vCPU, 1 GB RAM) : 7.59 $/mois
- EBS Storage 8 GB : 0.80 $/mois (obligatoire pour EC2)
- RDS PostgreSQL db.t3.micro (1 vCPU, 1 GB RAM) : 14.60 $/mois
- RDS Storage 20 GB : 2.30 $/mois (minimum RDS)
- Data Transfer sortant (estimé 20 GB) : 1.80 $/mois
- Elastic IP : 0 $ (si attaché)
**Total réel minimum** : ~27.09 $/mois (~16 254 FCFA/mois)
**Inclus** : Backup automatique 7 jours, monitoring basique

**Configuration Petite Entreprise (Plus confortable)** :
- EC2 t3.micro (2 vCPU, 1 GB RAM) : 7.59 $/mois
- EBS Storage 10 GB : 1.00 $/mois
- RDS PostgreSQL db.t3.micro (1 vCPU, 1 GB RAM) : 14.60 $/mois
- RDS Storage 30 GB : 3.45 $/mois
- Data Transfer sortant 50 GB : 4.50 $/mois
- RDS Backup Storage 10 GB : 0.95 $/mois
- CloudWatch Logs : 0.50 $/mois
**Total réel** : ~32.59 $/mois (~19 554 FCFA/mois)
**Inclus** : Backup 30 jours, monitoring avancé, logs

**Configuration Moyenne Entreprise** :
- EC2 t3.small (2 vCPU, 2 GB RAM) : 15.18 $/mois
- RDS PostgreSQL db.t3.small (2 vCPU, 2 GB RAM) : 29.20 $/mois
- EBS Storage 50 GB : 5 $/mois
- S3 Storage 50 GB : 1.15 $/mois
- CloudFront 200 GB : 17 $/mois
- Route 53 : 0.50 $/mois
- Application Load Balancer : 16.20 $/mois
- Data Transfer 500 GB : 45 $/mois
- Backup (RDS Snapshot) : 5 $/mois
**Total réel** : ~134 $/mois (~80 400 FCFA/mois)

**Configuration Grande Entreprise** :
- EC2 t3.medium (2 vCPU, 4 GB RAM) : 30.37 $/mois
- RDS PostgreSQL db.t3.medium (2 vCPU, 4 GB RAM) : 58.40 $/mois
- Multi-AZ RDS : +100% (58.40 $/mois supplémentaire)
- EBS Storage 100 GB : 10 $/mois
- S3 Storage 200 GB : 4.60 $/mois
- CloudFront 1 TB : 85 $/mois
- Route 53 : 0.50 $/mois
- Application Load Balancer : 16.20 $/mois
- Data Transfer 2 TB : 180 $/mois
- Backup : 20 $/mois
- CloudWatch : 10 $/mois
**Total réel** : ~473 $/mois (~283 800 FCFA/mois)

### Google Cloud Platform (GCP)
**Configuration Petite Entreprise** :
- Compute Engine e2-micro (2 vCPU, 1 GB RAM) : 6.11 $/mois
- Cloud SQL PostgreSQL db-f1-micro (1 vCPU, 0.6 GB RAM) : 7.67 $/mois
- Persistent Disk 20 GB : 0.80 $/mois
- Cloud Storage 10 GB : 0.20 $/mois
- Cloud CDN 50 GB : 4 $/mois
- Network Egress 100 GB : 12 $/mois
**Total réel** : ~31 $/mois (~18 600 FCFA/mois)

**Configuration Moyenne Entreprise** :
- Compute Engine e2-small (2 vCPU, 2 GB RAM) : 12.23 $/mois
- Cloud SQL PostgreSQL db-n1-standard-1 (1 vCPU, 3.75 GB RAM) : 46.17 $/mois
- Persistent Disk 50 GB : 2 $/mois
- Cloud Storage 50 GB : 1 $/mois
- Cloud CDN 200 GB : 16 $/mois
- Network Egress 500 GB : 60 $/mois
- Cloud Load Balancing : 18 $/mois
**Total réel** : ~155 $/mois (~93 000 FCFA/mois)

### Microsoft Azure
**Configuration Petite Entreprise** :
- App Service B1 (1 Core, 1.75 GB RAM) : 13.14 $/mois
- Azure Database for PostgreSQL Basic (1 vCore, 2 GB RAM) : 24.82 $/mois
- Storage 20 GB : 0.40 $/mois
- CDN 50 GB : 4 $/mois
- Bandwidth 100 GB : 8.70 $/mois
**Total réel** : ~51 $/mois (~30 600 FCFA/mois)

**Configuration Moyenne Entreprise** :
- App Service S1 (1 Core, 1.75 GB RAM) : 70 $/mois
- Azure Database for PostgreSQL General Purpose (2 vCore, 10 GB RAM) : 146.72 $/mois
- Storage 100 GB : 2 $/mois
- CDN 200 GB : 16 $/mois
- Bandwidth 500 GB : 43.50 $/mois
- Application Gateway : 125 $/mois
**Total réel** : ~403 $/mois (~241 800 FCFA/mois)

---

## Option 5 : Hébergeurs Européens Populaires

### OVH (France) - Bon pour l'Afrique
**VPS Starter** :
- 1 vCPU, 2 GB RAM, 20 GB SSD : 3.50 €/mois (~3.80 $/mois)
- 2 vCPU, 4 GB RAM, 40 GB SSD : 7.00 €/mois (~7.60 $/mois)
- Backup automatique : +2 €/mois (~2.17 $/mois)
- Datacenters en France (bonne latence Afrique)
- Support en français

**Total réel** : 5.97-9.77 $/mois (~3 582-5 862 FCFA/mois)

**Mon avis** :
✅ Prix compétitif
✅ Support français (important pour le Cameroun)
✅ Bonne latence Afrique
✅ Infrastructure solide
⚠️ Interface un peu complexe
⚠️ Support parfois lent

**Recommandation** : Très bon choix, alternative sérieuse à Hetzner

### Hostinger (International)
**VPS KVM 1** :
- 1 vCPU, 4 GB RAM, 50 GB SSD : 5.99 $/mois (promo)
- 2 vCPU, 8 GB RAM, 100 GB SSD : 8.99 $/mois (promo)
- Prix normal après : 8.99-12.99 $/mois
- Backup hebdomadaire : +2 $/mois
- Panel de gestion inclus

**Total réel** : 7.99-14.99 $/mois (~4 794-8 994 FCFA/mois)

**Mon avis** :
✅ Beaucoup de RAM pour le prix
✅ Interface très simple
✅ Support 24/7 en français
⚠️ Prix promo (augmente après)
⚠️ Performances moyennes
❌ Latence variable pour l'Afrique

**Recommandation** : Bon pour débuter, mais attention au renouvellement

### LWS (France) - Spécialiste Francophone
**VPS Linux Starter** :
- 2 vCPU, 2 GB RAM, 40 GB SSD : 5.99 €/mois (~6.50 $/mois)
- 4 vCPU, 4 GB RAM, 80 GB SSD : 11.99 €/mois (~13 $/mois)
- Backup automatique : +3 €/mois (~3.25 $/mois)
- Serveurs en France
- Support français premium

**Total réel** : 9.75-16.25 $/mois (~5 850-9 750 FCFA/mois)

**Mon avis** :
✅ Support français excellent
✅ Interface simple et claire
✅ Bon pour clients francophones
✅ Facturation en euros (stable)
⚠️ Plus cher que Hetzner/OVH
⚠️ Moins connu internationalement

**Recommandation** : Bon si tu privilégies le support français

---

## Comparaison Complète des Hébergeurs

### Tableau Comparatif (Config 2 vCPU, 4 GB RAM)

| Hébergeur | Prix/mois | Backup | Latence Afrique | Support FR | Note |
|-----------|-----------|--------|-----------------|------------|------|
| **Hetzner** | **6.30 $** | **+1.26 $** | ⭐⭐⭐⭐ | ❌ | **⭐⭐⭐⭐⭐** |
| **OVH** | **7.60 $** | **+2.17 $** | ⭐⭐⭐⭐⭐ | ✅ | **⭐⭐⭐⭐** |
| Hostinger | 8.99 $ | +2.00 $ | ⭐⭐⭐ | ✅ | ⭐⭐⭐ |
| LWS | 13.00 $ | +3.25 $ | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐ |
| DigitalOcean | 18.00 $ | +3.60 $ | ⭐⭐⭐ | ❌ | ⭐⭐⭐⭐ |
| AWS | 27.09 $ | inclus | ⭐⭐⭐⭐ | ❌ | ⭐⭐⭐⭐⭐ |

### Analyse Détaillée

**🏆 Meilleur rapport qualité/prix : Hetzner**
- Le moins cher (6.30 $)
- Excellentes performances
- Infrastructure moderne
- Seul inconvénient : support en anglais/allemand

**🇫🇷 Meilleur pour francophones : OVH**
- Prix compétitif (7.60 $)
- Support en français
- Serveurs en France (excellente latence Cameroun)
- Marque reconnue en Afrique

**💰 Meilleur pour débutants : Hostinger**
- Interface très simple
- Support français 24/7
- Beaucoup de RAM
- Attention au prix après promo

**🎯 Meilleur support : LWS**
- Support français premium
- Interface claire
- Bon pour non-techniques
- Plus cher

---

## Mon Classement pour CocoaTrack

### 1️⃣ Hetzner CX21 - 6.30 $/mois
**Pourquoi** : Meilleur prix, excellentes perfs
**Pour qui** : Si tu es à l'aise avec l'anglais
**Note** : 9.5/10

### 2️⃣ OVH VPS - 7.60 $/mois
**Pourquoi** : Support français, bonne latence Afrique
**Pour qui** : Si tu préfères le support en français
**Note** : 9/10

### 3️⃣ Hostinger VPS - 8.99 $/mois
**Pourquoi** : Simple, beaucoup de RAM
**Pour qui** : Débutants, besoin de simplicité
**Note** : 7.5/10

### 4️⃣ LWS VPS - 13.00 $/mois
**Pourquoi** : Support premium français
**Pour qui** : Si budget permet et tu veux du support
**Note** : 7/10

### 5️⃣ DigitalOcean - 18.00 $/mois
**Pourquoi** : Marque reconnue, bon écosystème
**Pour qui** : Si tu veux une marque internationale
**Note** : 8/10

### 6️⃣ AWS - 27.09 $/mois
**Pourquoi** : Le plus fiable, scalable
**Pour qui** : Grandes entreprises, budget confortable
**Note** : 9.5/10 (mais cher)

---

## Option 6 : Hébergement Local (Cameroun)

### Serveur Dédié Local
**Prix** : Variable selon fournisseur
- Avantages : Données locales, pas de frais internationaux
- Inconvénients : Maintenance, électricité, connexion internet

**Fournisseurs potentiels au Cameroun** :
- Camtel
- MTN Business
- Orange Business

---

## Recommandations par Cas d'Usage

### Pour Tester / Développement
**Railway.app (Gratuit) + Netlify (Gratuit)**
- Coût : 0 $/mois
- Parfait pour démonstration

### Pour Petite Entreprise (< 50 utilisateurs)
**Railway.app ou Render.com**
- Coût : 10-15 $/mois
- Simple à gérer
- Scalable facilement

### Pour Moyenne Entreprise (50-200 utilisateurs)
**DigitalOcean ou Hetzner VPS**
- Coût : 12-24 $/mois
- Plus de contrôle
- Bonnes performances

### Pour Grande Entreprise (> 200 utilisateurs)
**AWS, GCP ou Azure**
- Coût : 50-200 $/mois
- Haute disponibilité
- Support professionnel
- Backup automatique

---

## Coûts Additionnels à Prévoir

### Nom de Domaine
- **.com** : 10-15 $/an
- **.cm** (Cameroun) : 20-30 $/an

### Certificat SSL
- Gratuit avec Let's Encrypt (inclus dans la plupart des hébergeurs)

### Backup / Sauvegarde
- 5-10 $/mois selon la solution

### Monitoring
- Gratuit (UptimeRobot, Pingdom free tier)
- Payant : 10-50 $/mois (Datadog, New Relic)

---

## Ma Recommandation pour CocoaTrack

### Phase 1 : Lancement (0-3 mois) - 1-10 utilisateurs
**Railway.app (Plan Hobby)**
- Coût : 5 $/mois (~3 000 FCFA/mois)
- Déploiement en 5 minutes
- PostgreSQL inclus
- SSL automatique
- Parfait pour valider le produit
- **Budget total** : 72 $/an (~43 200 FCFA/an)

### Phase 2 : Croissance (3-12 mois) - 10-50 utilisateurs
**Hetzner VPS CX21 + Backup**
- Coût : 8.56 $/mois (~5 136 FCFA/mois)
- 2 vCPU, 4 GB RAM, 40 GB SSD
- Excellent rapport qualité/prix
- Serveurs en Europe (bonne latence Afrique)
- Backup automatique inclus
- **Budget total** : 103 $/an (~61 800 FCFA/an)

### Phase 3 : Stabilisation (12-24 mois) - 50-200 utilisateurs
**DigitalOcean Droplet + Managed Database**
- Coût : 27 $/mois (~16 200 FCFA/mois)
- Droplet 2GB + PostgreSQL 1GB
- Backup automatique
- Monitoring inclus
- Support 24/7
- **Budget total** : 324 $/an (~194 400 FCFA/an)

### Phase 4 : Production (24+ mois) - 200+ utilisateurs
**AWS (Configuration Moyenne)**
- Coût : 134 $/mois (~80 400 FCFA/mois)
- Haute disponibilité
- Scalabilité automatique
- Backup multi-région
- Support professionnel
- **Budget total** : 1 608 $/an (~964 800 FCFA/an)

---

## Calcul Total Première Année (Détaillé)

### Scénario 1 : Startup / Test (Railway.app)
- Hébergement : 5 $/mois × 12 = 60 $
- Domaine .com : 12 $
- SSL : 0 $ (inclus)
- **Total Année 1** : 72 $/an (~43 200 FCFA/an)
- **Coût mensuel moyen** : 6 $/mois (~3 600 FCFA/mois)

### Scénario 2 : Petite Entreprise (Hetzner VPS)
- Hébergement CX21 : 6.30 $/mois × 12 = 75.60 $
- Backup : 1.26 $/mois × 12 = 15.12 $
- Domaine .com : 12 $
- SSL : 0 $ (Let's Encrypt)
- Monitoring (UptimeRobot) : 0 $ (gratuit)
- **Total Année 1** : 102.72 $/an (~61 632 FCFA/an)
- **Coût mensuel moyen** : 8.56 $/mois (~5 136 FCFA/mois)

### Scénario 3 : Moyenne Entreprise (DigitalOcean)
- Hébergement Droplet 2GB : 12 $/mois × 12 = 144 $
- Backup automatique : 2.40 $/mois × 12 = 28.80 $
- Managed PostgreSQL 1GB : 15 $/mois × 12 = 180 $
- Domaine .com : 12 $
- SSL : 0 $ (inclus)
- Monitoring (Datadog) : 15 $/mois × 12 = 180 $
- CDN (Cloudflare Pro) : 20 $/mois × 12 = 240 $
- **Total Année 1** : 784.80 $/an (~470 880 FCFA/an)
- **Coût mensuel moyen** : 65.40 $/mois (~39 240 FCFA/mois)

### Scénario 4 : Grande Entreprise (AWS)
- EC2 t3.small : 15.18 $/mois × 12 = 182.16 $
- RDS PostgreSQL t3.small : 29.20 $/mois × 12 = 350.40 $
- EBS Storage 50GB : 5 $/mois × 12 = 60 $
- S3 + CloudFront : 18 $/mois × 12 = 216 $
- Load Balancer : 16.20 $/mois × 12 = 194.40 $
- Data Transfer : 45 $/mois × 12 = 540 $
- Route 53 : 0.50 $/mois × 12 = 6 $
- Backup : 5 $/mois × 12 = 60 $
- CloudWatch : 10 $/mois × 12 = 120 $
- Domaine .com : 12 $
- Support Developer : 29 $/mois × 12 = 348 $
- **Total Année 1** : 2 088.96 $/an (~1 253 376 FCFA/an)
- **Coût mensuel moyen** : 174.08 $/mois (~104 448 FCFA/mois)

### Scénario 5 : Entreprise Premium (AWS Multi-AZ)
- EC2 t3.medium : 30.37 $/mois × 12 = 364.44 $
- RDS PostgreSQL Multi-AZ t3.medium : 116.80 $/mois × 12 = 1 401.60 $
- EBS Storage 100GB : 10 $/mois × 12 = 120 $
- S3 + CloudFront : 90 $/mois × 12 = 1 080 $
- Load Balancer : 16.20 $/mois × 12 = 194.40 $
- Data Transfer : 180 $/mois × 12 = 2 160 $
- Route 53 : 0.50 $/mois × 12 = 6 $
- Backup : 20 $/mois × 12 = 240 $
- CloudWatch : 10 $/mois × 12 = 120 $
- WAF (Firewall) : 5 $/mois × 12 = 60 $
- Domaine .com : 12 $
- Support Business : 100 $/mois × 12 = 1 200 $
- **Total Année 1** : 6 958.44 $/an (~4 175 064 FCFA/an)
- **Coût mensuel moyen** : 579.87 $/mois (~347 922 FCFA/mois)

---

## Notes Importantes

1. **Tous les prix sont indicatifs** et peuvent varier
2. **Taux de change** : 1 $ ≈ 600 FCFA (variable)
3. **Paiement** : La plupart des hébergeurs acceptent les cartes bancaires internationales
4. **Support** : Privilégier les hébergeurs avec bon support technique
5. **Localisation** : Serveurs en Europe = meilleure latence pour l'Afrique

---

## Prochaines Étapes

1. Choisir une option selon votre budget
2. Créer un compte sur la plateforme choisie
3. Configurer le déploiement (je peux vous aider)
4. Tester l'application en production
5. Configurer les sauvegardes automatiques

---

**Date** : Novembre 2025
**Projet** : CocoaTrack - Gestion des livraisons de cacao
