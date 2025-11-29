from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date
from ..models import Delivery, Planter, ChefPlanteur

def get_summary_by_planter(db: Session, from_date: Optional[date] = None, to_date: Optional[date] = None):
    query = db.query(
        Planter.name,
        func.sum(Delivery.quantity_kg).label("total_kg")
    ).join(Delivery, Planter.id == Delivery.planter_id)
    
    if from_date:
        query = query.filter(Delivery.date >= from_date)
    if to_date:
        query = query.filter(Delivery.date <= to_date)
    
    results = query.group_by(Planter.name).all()
    total_general = sum(r.total_kg for r in results)
    
    return {
        "items": [{"planter": r.name, "total_kg": float(r.total_kg)} for r in results],
        "total_general": float(total_general)
    }

def get_summary_by_zones(
    db: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    load: Optional[str] = None,
    unload: Optional[str] = None
):
    # Synthèse détaillée par planteur et zone de chargement
    query_loaded = db.query(
        Planter.name.label("planter"),
        Delivery.load_location.label("location"),
        func.sum(Delivery.quantity_kg).label("total_kg")
    ).join(Delivery, Planter.id == Delivery.planter_id)
    
    if from_date:
        query_loaded = query_loaded.filter(Delivery.date >= from_date)
    if to_date:
        query_loaded = query_loaded.filter(Delivery.date <= to_date)
    if load:
        query_loaded = query_loaded.filter(Delivery.load_location.ilike(f"%{load}%"))
    
    loaded_results = query_loaded.group_by(Planter.name, Delivery.load_location).all()
    
    # Synthèse détaillée par planteur et zone de déchargement
    query_unloaded = db.query(
        Planter.name.label("planter"),
        Delivery.unload_location.label("location"),
        func.sum(Delivery.quantity_kg).label("total_kg")
    ).join(Delivery, Planter.id == Delivery.planter_id)
    
    if from_date:
        query_unloaded = query_unloaded.filter(Delivery.date >= from_date)
    if to_date:
        query_unloaded = query_unloaded.filter(Delivery.date <= to_date)
    if unload:
        query_unloaded = query_unloaded.filter(Delivery.unload_location.ilike(f"%{unload}%"))
    
    unloaded_results = query_unloaded.group_by(Planter.name, Delivery.unload_location).all()
    
    # Créer des dictionnaires pour les lieux de chargement et déchargement
    loaded_by_planter_location = {}
    for r in loaded_results:
        key = (r.planter, r.location)
        loaded_by_planter_location[key] = float(r.total_kg)
    
    unloaded_by_planter_location = {}
    for r in unloaded_results:
        key = (r.planter, r.location)
        unloaded_by_planter_location[key] = float(r.total_kg)
    
    # Combiner tous les planteurs et lieux
    all_keys = set(loaded_by_planter_location.keys()) | set(unloaded_by_planter_location.keys())
    
    items = [
        {
            "planter": planter,
            "location": location,
            "total_loaded_kg": loaded_by_planter_location.get((planter, location), 0),
            "total_unloaded_kg": unloaded_by_planter_location.get((planter, location), 0)
        }
        for planter, location in sorted(all_keys, key=lambda x: (x[1], x[0]))  # Trier par zone puis planteur
    ]
    
    return {
        "items": items,
        "total_loaded": sum(loaded_by_planter_location.values()),
        "total_unloaded": sum(unloaded_by_planter_location.values())
    }

def get_summary_by_quality(
    db: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    quality: Optional[str] = None
):
    query = db.query(
        Delivery.cocoa_quality,
        Planter.name,
        func.sum(Delivery.quantity_kg).label("total_unloaded_kg")
    ).join(Planter, Delivery.planter_id == Planter.id)
    
    if from_date:
        query = query.filter(Delivery.date >= from_date)
    if to_date:
        query = query.filter(Delivery.date <= to_date)
    if quality:
        query = query.filter(Delivery.cocoa_quality.ilike(f"%{quality}%"))
    
    results = query.group_by(Delivery.cocoa_quality, Planter.name).order_by(Delivery.cocoa_quality, Planter.name).all()
    total = sum(r.total_unloaded_kg for r in results)
    
    return {
        "items": [{"quality": r.cocoa_quality, "planter": r.name, "total_unloaded_kg": float(r.total_unloaded_kg)} for r in results],
        "total": float(total)
    }

def get_summary_by_fournisseur(db: Session, from_date: Optional[date] = None, to_date: Optional[date] = None):
    """
    Synthèse par fournisseur (chef planteur) avec:
    - Total des livraisons de tous leurs planteurs
    - Quantité maximale déclarée
    - Pourcentage d'utilisation
    """
    # Récupérer tous les fournisseurs
    all_fournisseurs = db.query(ChefPlanteur).all()
    
    # Pour chaque fournisseur, calculer les statistiques
    results = []
    for fournisseur in all_fournisseurs:
        # Récupérer les IDs des planteurs de ce fournisseur
        planter_ids = [p.id for p in fournisseur.planteurs]
        
        if not planter_ids:
            # Pas de planteurs associés
            results.append({
                'id': fournisseur.id,
                'name': fournisseur.name,
                'quantite_max_kg': fournisseur.quantite_max_kg,
                'total_loaded_kg': 0,
                'total_unloaded_kg': 0,
                'nombre_livraisons': 0
            })
            continue
        
        # Construire la requête pour les livraisons
        delivery_query = db.query(
            func.coalesce(func.sum(Delivery.quantity_loaded_kg), 0).label("total_loaded_kg"),
            func.coalesce(func.sum(Delivery.quantity_kg), 0).label("total_unloaded_kg"),
            func.count(Delivery.id).label("nombre_livraisons")
        ).filter(Delivery.planter_id.in_(planter_ids))
        
        if from_date:
            delivery_query = delivery_query.filter(Delivery.date >= from_date)
        if to_date:
            delivery_query = delivery_query.filter(Delivery.date <= to_date)
        
        stats = delivery_query.first()
        
        results.append({
            'id': fournisseur.id,
            'name': fournisseur.name,
            'quantite_max_kg': fournisseur.quantite_max_kg,
            'total_loaded_kg': stats.total_loaded_kg if stats else 0,
            'total_unloaded_kg': stats.total_unloaded_kg if stats else 0,
            'nombre_livraisons': stats.nombre_livraisons if stats else 0
        })
    
    items = []
    total_loaded = 0
    total_unloaded = 0
    total_max = 0
    
    for r in results:
        loaded = float(r['total_loaded_kg'])
        unloaded = float(r['total_unloaded_kg'])
        max_kg = float(r['quantite_max_kg'])
        pertes = loaded - unloaded if loaded > 0 else 0
        pct_pertes = (pertes / loaded * 100) if loaded > 0 else 0
        pct_utilisation = (loaded / max_kg * 100) if max_kg > 0 else 0
        
        items.append({
            "fournisseur": r['name'],
            "total_loaded_kg": loaded,
            "total_unloaded_kg": unloaded,
            "pertes_kg": pertes,
            "pct_pertes": pct_pertes,
            "quantite_max_kg": max_kg,
            "pct_utilisation": pct_utilisation,
            "nombre_livraisons": r['nombre_livraisons']
        })
        
        total_loaded += loaded
        total_unloaded += unloaded
        total_max += max_kg
    
    total_pertes = total_loaded - total_unloaded
    pct_pertes_global = (total_pertes / total_loaded * 100) if total_loaded > 0 else 0
    pct_utilisation_global = (total_loaded / total_max * 100) if total_max > 0 else 0
    
    return {
        "items": items,
        "total_loaded": total_loaded,
        "total_unloaded": total_unloaded,
        "total_pertes": total_pertes,
        "pct_pertes_global": pct_pertes_global,
        "total_max": total_max,
        "pct_utilisation_global": pct_utilisation_global
    }
