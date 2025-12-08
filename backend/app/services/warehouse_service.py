from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from ..models.warehouse import Warehouse
from ..models.stock_movement import StockMovement, MovementType
from ..schemas.warehouse import WarehouseWithStock, StockAlert

class WarehouseService:
    
    @staticmethod
    def calculate_current_stock(db: Session, warehouse_id: UUID) -> float:
        """Calculer le stock actuel d'un entrepôt"""
        result = db.query(func.sum(StockMovement.quantity_kg)).filter(
            StockMovement.warehouse_id == warehouse_id
        ).scalar()
        return float(result) if result else 0.0
    
    @staticmethod
    def get_warehouse_with_stock(db: Session, warehouse_id: UUID) -> Optional[WarehouseWithStock]:
        """Obtenir un entrepôt avec son stock actuel"""
        warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
        if not warehouse:
            return None
        
        current_stock = WarehouseService.calculate_current_stock(db, warehouse_id)
        stock_percentage = (current_stock / float(warehouse.capacity_kg)) * 100 if warehouse.capacity_kg > 0 else 0
        
        # Déterminer le statut d'alerte basé sur le pourcentage de remplissage
        # Critique si < 20%, Warning si < 40%, OK sinon
        alert_status = 'ok'
        if stock_percentage < 20:
            alert_status = 'critical'
        elif stock_percentage < 40:
            alert_status = 'warning'
        
        return WarehouseWithStock(
            id=warehouse.id,
            name=warehouse.name,
            location=warehouse.location,
            capacity_kg=float(warehouse.capacity_kg),
            alert_threshold_kg=float(warehouse.alert_threshold_kg),
            manager_name=warehouse.manager_name,
            phone=warehouse.phone,
            is_active=warehouse.is_active,
            created_at=warehouse.created_at,
            updated_at=warehouse.updated_at,
            current_stock_kg=current_stock,
            stock_percentage=stock_percentage,
            alert_status=alert_status
        )
    
    @staticmethod
    def get_all_warehouses_with_stock(db: Session) -> List[WarehouseWithStock]:
        """Obtenir tous les entrepôts avec leur stock"""
        warehouses = db.query(Warehouse).all()
        return [WarehouseService.get_warehouse_with_stock(db, w.id) for w in warehouses]
    
    @staticmethod
    def get_stock_alerts(db: Session) -> List[StockAlert]:
        """Obtenir les alertes de stock bas"""
        warehouses = db.query(Warehouse).filter(Warehouse.is_active == 'true').all()
        alerts = []
        
        for warehouse in warehouses:
            current_stock = WarehouseService.calculate_current_stock(db, warehouse.id)
            capacity = float(warehouse.capacity_kg)
            
            stock_percentage = (current_stock / capacity) * 100 if capacity > 0 else 0
            
            # Critique si < 20%, Warning si < 40%
            if stock_percentage < 20:
                alert_level = 'critical'
                message = f"Stock critique! {current_stock:.2f} kg ({stock_percentage:.1f}% de la capacité)"
            elif stock_percentage < 40:
                alert_level = 'warning'
                message = f"Stock faible: {current_stock:.2f} kg ({stock_percentage:.1f}% de la capacité)"
            else:
                continue
            
            alerts.append(StockAlert(
                warehouse_id=warehouse.id,
                warehouse_name=warehouse.name,
                current_stock_kg=current_stock,
                alert_threshold_kg=threshold,
                alert_level=alert_level,
                message=message
            ))
        
        return alerts
    
    @staticmethod
    def create_movement(
        db: Session,
        warehouse_id: UUID,
        movement_type: MovementType,
        quantity_kg: float,
        user_id: UUID,
        **kwargs
    ) -> StockMovement:
        """Créer un mouvement de stock"""
        
        # Pour les sorties, la quantité doit être négative
        if movement_type in [MovementType.EXIT, MovementType.LOSS]:
            quantity_kg = -abs(quantity_kg)
        else:
            quantity_kg = abs(quantity_kg)
        
        movement = StockMovement(
            warehouse_id=warehouse_id,
            movement_type=movement_type,
            quantity_kg=quantity_kg,
            created_by=user_id,
            **kwargs
        )
        
        db.add(movement)
        db.commit()
        db.refresh(movement)
        
        return movement
    
    @staticmethod
    def transfer_stock(
        db: Session,
        from_warehouse_id: UUID,
        to_warehouse_id: UUID,
        quantity_kg: float,
        user_id: UUID,
        notes: Optional[str] = None
    ):
        """Transférer du stock entre deux entrepôts"""
        
        # Sortie de l'entrepôt source
        WarehouseService.create_movement(
            db, from_warehouse_id, MovementType.TRANSFER, -abs(quantity_kg),
            user_id, to_warehouse_id=to_warehouse_id, notes=notes
        )
        
        # Entrée dans l'entrepôt destination
        WarehouseService.create_movement(
            db, to_warehouse_id, MovementType.TRANSFER, abs(quantity_kg),
            user_id, from_warehouse_id=from_warehouse_id, notes=notes
        )
