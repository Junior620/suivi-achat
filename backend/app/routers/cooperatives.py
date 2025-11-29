from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List
from ..database import get_db
from ..models import Planter, ChefPlanteur, Delivery
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/cooperatives", tags=["cooperatives"])

@router.get("")
def list_cooperatives(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Liste toutes les coopératives avec leurs statistiques"""
    
    # Récupérer toutes les coopératives uniques des planteurs
    planteurs_coops = db.query(
        Planter.cooperative.label('nom'),
        func.count(Planter.id).label('nb_planteurs')
    ).filter(
        Planter.cooperative.isnot(None),
        Planter.cooperative != ''
    ).group_by(Planter.cooperative).all()
    
    # Récupérer toutes les coopératives uniques des fournisseurs
    fournisseurs_coops = db.query(
        ChefPlanteur.cooperative.label('nom'),
        func.count(ChefPlanteur.id).label('nb_fournisseurs')
    ).filter(
        ChefPlanteur.cooperative.isnot(None),
        ChefPlanteur.cooperative != ''
    ).group_by(ChefPlanteur.cooperative).all()
    
    # Créer un dictionnaire pour fusionner les données
    cooperatives_dict = {}
    
    # Ajouter les coopératives des planteurs
    for coop in planteurs_coops:
        if coop.nom not in cooperatives_dict:
            cooperatives_dict[coop.nom] = {
                'nom': coop.nom,
                'nb_planteurs': 0,
                'nb_fournisseurs': 0,
                'total_charge_kg': 0,
                'total_decharge_kg': 0,
                'pertes_kg': 0,
                'pourcentage_pertes': 0
            }
        cooperatives_dict[coop.nom]['nb_planteurs'] = coop.nb_planteurs
    
    # Ajouter les coopératives des fournisseurs
    for coop in fournisseurs_coops:
        if coop.nom not in cooperatives_dict:
            cooperatives_dict[coop.nom] = {
                'nom': coop.nom,
                'nb_planteurs': 0,
                'nb_fournisseurs': 0,
                'total_charge_kg': 0,
                'total_decharge_kg': 0,
                'pertes_kg': 0,
                'pourcentage_pertes': 0
            }
        cooperatives_dict[coop.nom]['nb_fournisseurs'] = coop.nb_fournisseurs
    
    # Calculer les statistiques de livraison pour chaque coopérative
    for nom_coop in cooperatives_dict.keys():
        # Récupérer les IDs des planteurs de cette coopérative
        planteur_ids = db.query(Planter.id).filter(Planter.cooperative == nom_coop).all()
        planteur_ids = [p[0] for p in planteur_ids]
        
        if planteur_ids:
            # Calculer les totaux
            stats = db.query(
                func.sum(Delivery.quantity_loaded_kg).label('total_charge'),
                func.sum(Delivery.quantity_kg).label('total_decharge')
            ).filter(Delivery.planter_id.in_(planteur_ids)).first()
            
            total_charge = float(stats.total_charge or 0)
            total_decharge = float(stats.total_decharge or 0)
            pertes = total_charge - total_decharge
            pourcentage_pertes = (pertes / total_charge * 100) if total_charge > 0 else 0
            
            cooperatives_dict[nom_coop]['total_charge_kg'] = total_charge
            cooperatives_dict[nom_coop]['total_decharge_kg'] = total_decharge
            cooperatives_dict[nom_coop]['pertes_kg'] = pertes
            cooperatives_dict[nom_coop]['pourcentage_pertes'] = round(pourcentage_pertes, 2)
    
    # Convertir en liste et trier par nom
    cooperatives_list = sorted(cooperatives_dict.values(), key=lambda x: x['nom'])
    
    return cooperatives_list

@router.get("/names")
def get_cooperative_names(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Récupère la liste des noms de coopératives uniques pour l'autocomplétion"""
    
    # Récupérer les coopératives des planteurs
    planteurs_coops = db.query(distinct(Planter.cooperative)).filter(
        Planter.cooperative.isnot(None),
        Planter.cooperative != ''
    ).all()
    
    # Récupérer les coopératives des fournisseurs
    fournisseurs_coops = db.query(distinct(ChefPlanteur.cooperative)).filter(
        ChefPlanteur.cooperative.isnot(None),
        ChefPlanteur.cooperative != ''
    ).all()
    
    # Fusionner et dédupliquer
    all_coops = set()
    for coop in planteurs_coops:
        if coop[0]:
            all_coops.add(coop[0])
    for coop in fournisseurs_coops:
        if coop[0]:
            all_coops.add(coop[0])
    
    # Retourner la liste triée
    return sorted(list(all_coops))

@router.get("/{nom_cooperative:path}")
def get_cooperative_details(
    nom_cooperative: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Récupère les détails d'une coopérative spécifique"""
    
    # Décoder le nom de la coopérative (au cas où)
    from urllib.parse import unquote
    nom_cooperative = unquote(nom_cooperative)
    
    # Récupérer les planteurs de cette coopérative
    planteurs = db.query(Planter).filter(Planter.cooperative == nom_cooperative).all()
    
    # Récupérer les fournisseurs de cette coopérative
    fournisseurs = db.query(ChefPlanteur).filter(ChefPlanteur.cooperative == nom_cooperative).all()
    
    # Calculer les statistiques
    planteur_ids = [p.id for p in planteurs]
    
    total_charge = 0
    total_decharge = 0
    
    if planteur_ids:
        stats = db.query(
            func.sum(Delivery.quantity_loaded_kg).label('total_charge'),
            func.sum(Delivery.quantity_kg).label('total_decharge')
        ).filter(Delivery.planter_id.in_(planteur_ids)).first()
        
        total_charge = float(stats.total_charge or 0)
        total_decharge = float(stats.total_decharge or 0)
    
    pertes = total_charge - total_decharge
    pourcentage_pertes = (pertes / total_charge * 100) if total_charge > 0 else 0
    
    return {
        'nom': nom_cooperative,
        'nb_planteurs': len(planteurs),
        'nb_fournisseurs': len(fournisseurs),
        'total_charge_kg': total_charge,
        'total_decharge_kg': total_decharge,
        'pertes_kg': pertes,
        'pourcentage_pertes': round(pourcentage_pertes, 2),
        'planteurs': [
            {
                'id': p.id,
                'name': p.name,
                'phone': p.phone,
                'region': p.region,
                'departement': p.departement,
                'localite': p.localite
            } for p in planteurs
        ],
        'fournisseurs': [
            {
                'id': f.id,
                'name': f.name,
                'phone': f.phone,
                'region': f.region,
                'departement': f.departement,
                'localite': f.localite
            } for f in fournisseurs
        ]
    }
