"""
Routes pour le journal d'audit
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from ..database import get_db
from ..middleware.auth import get_current_user
from ..models import AuditLog, User
from typing import Optional, List
from datetime import datetime, timedelta
import io
import csv
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer les logs d'audit avec filtres
    
    Permissions: admin, manager
    """
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    try:
        # Base query
        query = db.query(AuditLog)
        
        # Filtres
        filters = []
        
        if user_id:
            filters.append(AuditLog.user_id == user_id)
        
        if action:
            filters.append(AuditLog.action == action)
        
        if entity_type:
            filters.append(AuditLog.entity_type == entity_type)
        
        if entity_id:
            filters.append(AuditLog.entity_id == entity_id)
        
        if from_date:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            filters.append(AuditLog.created_at >= from_dt)
        
        if to_date:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            filters.append(AuditLog.created_at <= to_dt)
        
        if search:
            search_filter = or_(
                AuditLog.user_email.ilike(f"%{search}%"),
                AuditLog.entity_type.ilike(f"%{search}%"),
                AuditLog.entity_id.ilike(f"%{search}%"),
                AuditLog.reason.ilike(f"%{search}%")
            )
            filters.append(search_filter)
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Count total
        total = query.count()
        
        # Get logs
        logs = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "logs": [
                {
                    "id": log.id,
                    "user_id": str(log.user_id) if log.user_id else None,
                    "user_email": log.user_email,
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "changes": log.changes,
                    "ip_address": log.ip_address,
                    "reason": log.reason,
                    "created_at": log.created_at.isoformat() if log.created_at else None
                }
                for log in logs
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/{log_id}")
async def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer un log d'audit spécifique"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    
    return {
        "id": log.id,
        "user_id": str(log.user_id) if log.user_id else None,
        "user_email": log.user_email,
        "action": log.action,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "changes": log.changes,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "reason": log.reason,
        "created_at": log.created_at.isoformat() if log.created_at else None
    }


@router.get("/stats")
async def get_audit_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtenir les statistiques d'audit"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    try:
        from_date = datetime.now() - timedelta(days=days)
        
        # Total logs
        total_logs = db.query(AuditLog).filter(
            AuditLog.created_at >= from_date
        ).count()
        
        # Par action
        from sqlalchemy import func
        actions_stats = db.query(
            AuditLog.action,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.created_at >= from_date
        ).group_by(AuditLog.action).all()
        
        # Par entité
        entities_stats = db.query(
            AuditLog.entity_type,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.created_at >= from_date
        ).group_by(AuditLog.entity_type).all()
        
        # Utilisateurs les plus actifs
        top_users = db.query(
            AuditLog.user_email,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.created_at >= from_date,
            AuditLog.user_email != 'system'
        ).group_by(AuditLog.user_email).order_by(
            desc('count')
        ).limit(10).all()
        
        return {
            "period_days": days,
            "total_logs": total_logs,
            "by_action": {action: count for action, count in actions_stats},
            "by_entity": {entity: count for entity, count in entities_stats},
            "top_users": [
                {"email": email, "actions": count}
                for email, count in top_users
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching audit stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/csv")
async def export_audit_csv(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exporter les logs d'audit en CSV"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    try:
        # Base query
        query = db.query(AuditLog)
        
        # Filtres
        filters = []
        
        if from_date:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            filters.append(AuditLog.created_at >= from_dt)
        
        if to_date:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            filters.append(AuditLog.created_at <= to_dt)
        
        if action:
            filters.append(AuditLog.action == action)
        
        if entity_type:
            filters.append(AuditLog.entity_type == entity_type)
        
        if filters:
            query = query.filter(and_(*filters))
        
        logs = query.order_by(desc(AuditLog.created_at)).all()
        
        # Créer le CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # En-têtes
        writer.writerow([
            'ID', 'Date/Heure', 'Utilisateur', 'Action', 
            'Type Entité', 'ID Entité', 'Adresse IP', 'Raison'
        ])
        
        # Données
        for log in logs:
            writer.writerow([
                log.id,
                log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else '',
                log.user_email,
                log.action,
                log.entity_type,
                log.entity_id or '',
                log.ip_address or '',
                log.reason or ''
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=audit_trail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
        
    except Exception as e:
        logger.error(f"Error exporting audit CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_history(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtenir l'historique complet d'une entité"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == entity_type,
        AuditLog.entity_id == entity_id
    ).order_by(desc(AuditLog.created_at)).all()
    
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "history": [
            {
                "id": log.id,
                "action": log.action,
                "user_email": log.user_email,
                "changes": log.changes,
                "reason": log.reason,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }
