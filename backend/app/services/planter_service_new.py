"""
Service pour la validation des limites de production des planteurs
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from uuid import UUID
from ..models import Planter, Delivery, ChefPlanteur

def get_planter_stats(db: Session, planter_id: UUID) -> dict:
    """Calcule les statistiques de production d'un planteur"""
    planter = db.query(Planter).filter(Planter.id == planter_id).first()
    if not planter:
        raise HTTPException(status_code=404, detail="Planteur not found")
    
    # Calculer le total livré
    total_livre = db.query(func.sum(Delivery.quantity_kg)).filter(
        Delivery.planter_id == planter_id
    ).scalar() or 0
    
    total_livre = float(total_livre)
    limite = planter.limite_production_kg if planter.superficie_hectares else None
    
    if limite:
        restant = max(0, limite - total_livre)
        pourcentage = (total_livre / limite * 100) if limite > 0 else 0
    else:
        restant = None
        pourcentage = None
    
    return {
        "planter_id": planter.id,
        "planter_name": planter.name,
        "superficie_hectares": float(planter.superficie_hectares) if planter.superficie_hectares else None,
        "limite_production_kg": limite,
        "total_livre_kg": total_livre,
        "restant_kg": restant,
        "pourcentage_utilise": round(pourcentage, 2) if pourcentage is not None else None
    }

def check_production_limit(db: Session, planter_id: UUID, nouvelle_quantite: float) -> dict:
    """
    Vérifie DOUBLE validation :
    1. Limite individuelle du planteur (si superficie définie)
    2. Limite globale du chef planteur
    
    Retourne: {"ok": bool, "message": str, "details": dict}
    """
    # Récupérer le planteur
    planter = db.query(Planter).filter(Planter.id == planter_id).first()
    if not planter:
        raise HTTPException(status_code=404, detail="Planteur not found")
    
    # Chef planteur obligatoire
    if not planter.chef_planteur_id:
        raise HTTPException(status_code=400, detail="Ce planteur doit être associé à un chef planteur")
    
    # Stats du planteur
    planter_stats = get_planter_stats(db, planter_id)
    
    # VALIDATION 1 : Limite individuelle du planteur
    if planter_stats["limite_production_kg"]:
        nouveau_total_planteur = planter_stats["total_livre_kg"] + nouvelle_quantite
        limite_planteur = planter_stats["limite_production_kg"]
        
        if nouveau_total_planteur > limite_planteur:
            depassement = nouveau_total_planteur - limite_planteur
            return {
                "ok": False,
                "message": f"❌ Limite individuelle dépassée ! Le planteur '{planter.name}' ne peut livrer que {planter_stats['restant_kg']:.2f} kg maximum (dépassement de {depassement:.2f} kg). Superficie : {planter_stats['superficie_hectares']} ha.",
                "type": "planteur",
                "restant_kg": planter_stats["restant_kg"],
                "limite_kg": limite_planteur
            }
    
    # VALIDATION 2 : Limite globale du chef planteur
    chef = db.query(ChefPlanteur).filter(ChefPlanteur.id == planter.chef_planteur_id).first()
    
    # Calculer le total livré par tous les planteurs du chef
    planteurs_chef = db.query(Planter).filter(Planter.chef_planteur_id == chef.id).all()
    planteur_ids = [p.id for p in planteurs_chef]
    
    total_livre_chef = db.query(func.sum(Delivery.quantity_kg)).filter(
        Delivery.planter_id.in_(planteur_ids)
    ).scalar() or 0
    
    total_livre_chef = float(total_livre_chef)
    limite_chef = float(chef.quantite_max_kg)
    nouveau_total_chef = total_livre_chef + nouvelle_quantite
    
    if nouveau_total_chef > limite_chef:
        depassement = nouveau_total_chef - limite_chef
        restant_chef = max(0, limite_chef - total_livre_chef)
        return {
            "ok": False,
            "message": f"❌ Limite du chef planteur dépassée ! Le chef '{chef.name}' ne peut accepter que {restant_chef:.2f} kg maximum (dépassement de {depassement:.2f} kg). Quantité déclarée : {limite_chef:.2f} kg.",
            "type": "chef",
            "restant_kg": restant_chef,
            "limite_kg": limite_chef,
            "chef_name": chef.name
        }
    
    # Tout est OK
    restant_planteur = planter_stats["restant_kg"] if planter_stats["restant_kg"] is not None else "illimité"
    restant_chef = limite_chef - total_livre_chef - nouvelle_quantite
    
    return {
        "ok": True,
        "message": "✅ Validation réussie",
        "restant_planteur_kg": planter_stats["restant_kg"],
        "restant_chef_kg": restant_chef,
        "chef_name": chef.name
    }
