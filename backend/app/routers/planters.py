from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from ..database import get_db
from ..schemas import PlanterCreate, PlanterUpdate, PlanterResponse
from ..services import planter_service
from ..middleware.auth import require_role, get_current_user
from ..utils.pagination import PaginatedResponse

router = APIRouter(prefix="/planters", tags=["planters"])

@router.get("", response_model=PaginatedResponse[PlanterResponse])
def list_planters(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=10000),
    with_stats: bool = Query(False, description="Inclure les statistiques de livraison"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    print(f"DEBUG: with_stats = {with_stats}, type = {type(with_stats)}")
    planters, total = planter_service.get_planters(db, search, page, size)
    
    # Enrichir avec le nom du chef planteur et optionnellement les stats
    items = []
    for planter in planters:
        print(f"DEBUG: Processing planter {planter.name}, with_stats={with_stats}")
        if with_stats:
            # Utiliser la fonction de stats qui inclut tout
            planter_dict = planter_service.get_planter_stats(db, planter.id)
        else:
            planter_dict = {
                "id": planter.id,
                "name": planter.name,
                "phone": planter.phone,
                "cni": planter.cni,
                "cooperative": planter.cooperative,
                "region": planter.region,
                "departement": planter.departement,
                "localite": planter.localite,
                "statut_plantation": planter.statut_plantation,
                "superficie_hectares": float(planter.superficie_hectares) if planter.superficie_hectares else None,
                "limite_production_kg": float(planter.superficie_hectares * 1000) if planter.superficie_hectares else None,
                "chef_planteur_id": planter.chef_planteur_id,
                "chef_planteur_name": planter.chef_planteur.name if planter.chef_planteur else None,
                "created_at": planter.created_at,
                "updated_at": planter.updated_at
            }
        items.append(planter_dict)
    return PaginatedResponse(items=items, page=page, size=size, total=total)

@router.get("/{planter_id}", response_model=PlanterResponse)
def get_planter(
    planter_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return planter_service.get_planter(db, planter_id)

@router.post("", response_model=PlanterResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def create_planter(planter_data: PlanterCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return planter_service.create_planter(db, planter_data, current_user.id)

@router.put("/{planter_id}", response_model=PlanterResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def update_planter(planter_id: UUID, planter_data: PlanterUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return planter_service.update_planter(db, planter_id, planter_data, current_user.id)

@router.delete("/{planter_id}", dependencies=[Depends(require_role(["admin", "manager"]))])
def delete_planter(planter_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    planter_service.delete_planter(db, planter_id, current_user.id)
    return {"message": "Planter deleted successfully"}
