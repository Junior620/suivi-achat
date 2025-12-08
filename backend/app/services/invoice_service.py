"""Service pour la gestion des factures"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import os

from ..models.invoice import Invoice, InvoiceStatus
from ..models.planter import Planter
from ..models.payment import Payment


class InvoiceService:
    
    @staticmethod
    def generate_invoice_number(db: Session) -> str:
        """Générer le prochain numéro de facture"""
        year = datetime.now().year
        
        # Trouver le dernier numéro de l'année
        last_invoice = db.query(Invoice).filter(
            Invoice.invoice_number.like(f"{year}-%")
        ).order_by(desc(Invoice.invoice_number)).first()
        
        if last_invoice:
            last_num = int(last_invoice.invoice_number.split('-')[1])
            next_num = last_num + 1
        else:
            next_num = 1
        
        return f"{year}-{str(next_num).zfill(4)}"
    
    @staticmethod
    def create_invoice(
        db: Session,
        planter_id: UUID,
        amount: float,
        user_id: UUID,
        payment_id: Optional[UUID] = None,
        weight_kg: Optional[float] = None,
        price_per_kg: Optional[float] = None,
        notes: Optional[str] = None
    ) -> Invoice:
        """Créer une nouvelle facture"""
        
        invoice_number = InvoiceService.generate_invoice_number(db)
        
        invoice = Invoice(
            invoice_number=invoice_number,
            payment_id=payment_id,
            planter_id=planter_id,
            amount=amount,
            weight_kg=weight_kg,
            price_per_kg=price_per_kg,
            status=InvoiceStatus.ISSUED,
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=30),
            notes=notes,
            created_by=user_id
        )
        
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        
        # Générer le PDF
        InvoiceService.generate_pdf(db, invoice)
        
        return invoice
    
    @staticmethod
    def generate_pdf(db: Session, invoice: Invoice) -> str:
        """Générer le PDF de la facture"""
        
        # Créer le dossier si nécessaire
        pdf_dir = "uploads/invoices"
        os.makedirs(pdf_dir, exist_ok=True)
        
        # Chemin du fichier
        filename = f"{invoice.invoice_number}.pdf"
        filepath = os.path.join(pdf_dir, filename)
        
        # Créer le PDF
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Style personnalisé
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2D5016'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Titre
        story.append(Paragraph("🍫 CocoaTrack", title_style))
        story.append(Paragraph(f"FACTURE N° {invoice.invoice_number}", title_style))
        story.append(Spacer(1, 1*cm))
        
        # Informations
        planter = db.query(Planter).filter(Planter.id == invoice.planter_id).first()
        
        info_data = [
            ['Date:', invoice.issue_date.strftime('%d/%m/%Y')],
            ['Bénéficiaire:', planter.name if planter else 'N/A'],
            ['Téléphone:', planter.phone if planter and planter.phone else 'N/A'],
        ]
        
        info_table = Table(info_data, colWidths=[5*cm, 10*cm])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 1*cm))
        
        # Tableau des articles
        data = [['Description', 'Quantité', 'Prix unitaire', 'Total']]
        
        if invoice.weight_kg and invoice.price_per_kg:
            data.append([
                'Achat de cacao',
                f"{invoice.weight_kg} kg",
                f"{invoice.price_per_kg:,.0f} FCFA",
                f"{invoice.amount:,.0f} FCFA"
            ])
        else:
            data.append([
                'Paiement',
                '1',
                f"{invoice.amount:,.0f} FCFA",
                f"{invoice.amount:,.0f} FCFA"
            ])
        
        table = Table(data, colWidths=[8*cm, 3*cm, 4*cm, 4*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D5016')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(table)
        story.append(Spacer(1, 1*cm))
        
        # Total
        total_style = ParagraphStyle(
            'Total',
            parent=styles['Normal'],
            fontSize=18,
            textColor=colors.HexColor('#2D5016'),
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold'
        )
        story.append(Paragraph(f"TOTAL: {invoice.amount:,.0f} FCFA", total_style))
        
        # Construire le PDF
        doc.build(story)
        
        # Sauvegarder le chemin
        invoice.pdf_path = filepath
        db.commit()
        
        return filepath
    
    @staticmethod
    def get_invoices(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status: Optional[InvoiceStatus] = None,
        planter_id: Optional[UUID] = None
    ) -> List[Invoice]:
        """Récupérer la liste des factures"""
        query = db.query(Invoice)
        
        if status:
            query = query.filter(Invoice.status == status)
        if planter_id:
            query = query.filter(Invoice.planter_id == planter_id)
        
        return query.order_by(desc(Invoice.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_status(db: Session, invoice_id: UUID, status: InvoiceStatus) -> Invoice:
        """Mettre à jour le statut d'une facture"""
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return None
        
        invoice.status = status
        if status == InvoiceStatus.PAID:
            invoice.paid_date = datetime.utcnow()
        
        db.commit()
        db.refresh(invoice)
        return invoice
