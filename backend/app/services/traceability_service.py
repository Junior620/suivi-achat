import hashlib
import json
import qrcode
import io
import base64
from datetime import datetime
from sqlalchemy.orm import Session
from ..models.traceability import TraceabilityRecord, TraceabilityScan
from ..models.delivery import Delivery

class BlockchainService:
    """Service pour gérer la blockchain de traçabilité"""
    
    @staticmethod
    def calculate_hash(data: dict, previous_hash: str = None, block_number: int = 0) -> str:
        """Calcule le hash SHA-256 d'un bloc"""
        block_data = {
            'block_number': block_number,
            'previous_hash': previous_hash or '0',
            'timestamp': datetime.utcnow().isoformat(),
            'data': data
        }
        block_string = json.dumps(block_data, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    @staticmethod
    def verify_chain(db: Session) -> bool:
        """Vérifie l'intégrité de la blockchain"""
        records = db.query(TraceabilityRecord).order_by(TraceabilityRecord.block_number).all()
        
        for i, record in enumerate(records):
            # Vérifier le hash
            calculated_hash = BlockchainService.calculate_hash(
                record.trace_data,
                record.previous_hash,
                record.block_number
            )
            
            if calculated_hash != record.blockchain_hash:
                return False
            
            # Vérifier le lien avec le bloc précédent
            if i > 0:
                if record.previous_hash != records[i-1].blockchain_hash:
                    return False
        
        return True

class QRCodeService:
    """Service pour générer et gérer les QR codes"""
    
    @staticmethod
    def generate_qr_code(data: str) -> str:
        """Génère un QR code et retourne l'image en base64"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir en base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"

class TraceabilityService:
    """Service principal de traçabilité"""
    
    @staticmethod
    def create_traceability_record(db: Session, delivery: Delivery) -> TraceabilityRecord:
        """Crée un enregistrement de traçabilité pour une livraison"""
        
        # Obtenir le dernier bloc
        last_record = db.query(TraceabilityRecord).order_by(
            TraceabilityRecord.block_number.desc()
        ).first()
        
        block_number = (last_record.block_number + 1) if last_record else 1
        previous_hash = last_record.blockchain_hash if last_record else None
        
        # Préparer les données de traçabilité
        trace_data = {
            'delivery_id': str(delivery.id),
            'planter_id': str(delivery.planter_id),
            'planter_name': delivery.planter.nom if delivery.planter else None,
            'date': delivery.date.isoformat(),
            'quantity_kg': float(delivery.quantity_kg),
            'quality': delivery.quality,
            'load_location': delivery.load_location,
            'unload_location': delivery.unload_location,
            'vehicle': delivery.vehicle,
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Calculer le hash blockchain
        blockchain_hash = BlockchainService.calculate_hash(
            trace_data,
            previous_hash,
            block_number
        )
        
        # Générer le code QR unique
        qr_code = f"COCOA-{delivery.id}-{blockchain_hash[:8]}"
        qr_data = json.dumps({
            'qr_code': qr_code,
            'delivery_id': str(delivery.id),
            'blockchain_hash': blockchain_hash,
            'verify_url': f'/api/v1/traceability/verify/{qr_code}'
        })
        
        qr_code_image = QRCodeService.generate_qr_code(qr_data)
        
        # Créer l'enregistrement
        record = TraceabilityRecord(
            delivery_id=delivery.id,
            qr_code=qr_code,
            qr_code_image=qr_code_image,
            blockchain_hash=blockchain_hash,
            previous_hash=previous_hash,
            block_number=block_number,
            trace_data=trace_data
        )
        
        db.add(record)
        db.commit()
        db.refresh(record)
        
        return record
    
    @staticmethod
    def scan_qr_code(
        db: Session,
        qr_code: str,
        scanned_by: str,
        scan_location: str = None,
        scan_type: str = "verification",
        notes: str = None,
        latitude: str = None,
        longitude: str = None
    ) -> TraceabilityScan:
        """Enregistre un scan de QR code"""
        
        record = db.query(TraceabilityRecord).filter(
            TraceabilityRecord.qr_code == qr_code
        ).first()
        
        if not record:
            raise ValueError("QR code non trouvé")
        
        scan = TraceabilityScan(
            record_id=record.id,
            scanned_by=scanned_by,
            scan_location=scan_location,
            scan_type=scan_type,
            notes=notes,
            latitude=latitude,
            longitude=longitude
        )
        
        db.add(scan)
        db.commit()
        db.refresh(scan)
        
        return scan
    
    @staticmethod
    def verify_traceability(db: Session, qr_code: str) -> dict:
        """Vérifie l'authenticité d'une livraison via son QR code"""
        
        record = db.query(TraceabilityRecord).filter(
            TraceabilityRecord.qr_code == qr_code
        ).first()
        
        if not record:
            return {
                'is_valid': False,
                'message': 'QR code non trouvé dans la blockchain'
            }
        
        # Recalculer le hash pour vérifier l'intégrité
        calculated_hash = BlockchainService.calculate_hash(
            record.trace_data,
            record.previous_hash,
            record.block_number
        )
        
        is_valid = calculated_hash == record.blockchain_hash
        
        return {
            'is_valid': is_valid,
            'blockchain_hash': record.blockchain_hash,
            'block_number': record.block_number,
            'previous_hash': record.previous_hash,
            'message': 'Livraison authentique et vérifiée' if is_valid else 'Données altérées - Non authentique',
            'trace_data': record.trace_data,
            'scans_count': len(record.scans),
            'created_at': record.created_at.isoformat()
        }
    
    @staticmethod
    def get_delivery_timeline(db: Session, delivery_id: str) -> dict:
        """Obtient la timeline complète d'une livraison"""
        
        record = db.query(TraceabilityRecord).filter(
            TraceabilityRecord.delivery_id == delivery_id
        ).first()
        
        if not record:
            return None
        
        timeline = []
        
        # Événement de création
        timeline.append({
            'type': 'creation',
            'title': 'Livraison créée',
            'description': f"Livraison enregistrée dans la blockchain (Bloc #{record.block_number})",
            'timestamp': record.created_at.isoformat(),
            'data': record.trace_data
        })
        
        # Événements de scan
        for scan in sorted(record.scans, key=lambda x: x.scanned_at):
            timeline.append({
                'type': 'scan',
                'title': f'Scan: {scan.scan_type}',
                'description': scan.notes or f'Scanné par {scan.scanned_by}',
                'location': scan.scan_location,
                'coordinates': {
                    'lat': scan.latitude,
                    'lng': scan.longitude
                } if scan.latitude and scan.longitude else None,
                'timestamp': scan.scanned_at.isoformat(),
                'scanned_by': scan.scanned_by
            })
        
        return {
            'qr_code': record.qr_code,
            'blockchain_hash': record.blockchain_hash,
            'block_number': record.block_number,
            'timeline': timeline,
            'total_scans': len(record.scans)
        }
