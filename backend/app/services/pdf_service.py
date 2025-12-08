"""
Service de génération de PDF
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from io import BytesIO
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class PDFService:
    """Service pour générer des PDF"""
    
    @staticmethod
    def generate_report_pdf(report_data: dict) -> bytes:
        """Générer un PDF de rapport"""
        buffer = BytesIO()
        
        # Créer le document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#111827'),
            spaceAfter=12,
            spaceBefore=20
        )
        
        # Contenu
        story = []
        
        # Titre
        period_name = "Hebdomadaire" if report_data["period"] == "weekly" else "Mensuel"
        title = Paragraph(f"Rapport {period_name} CocoaTrack", title_style)
        story.append(title)
        
        subtitle = Paragraph(
            f"Du {report_data['start_date']} au {report_data['end_date']}",
            styles['Normal']
        )
        story.append(subtitle)
        story.append(Spacer(1, 1*cm))
        
        # KPIs
        story.append(Paragraph("📊 Indicateurs Clés de Performance", heading_style))
        
        current = report_data["current"]
        comparisons = report_data["comparisons"]
        
        kpi_data = [
            ["Indicateur", "Valeur", "Évolution"],
            ["Volume Total", f"{current['total_volume']:,.0f} kg", f"{comparisons['volume_change']:+.1f}%"],
            ["Nombre de Livraisons", f"{current['total_deliveries']}", f"{comparisons['deliveries_change']:+.1f}%"],
            ["Planteurs Actifs", f"{current['active_planters']}", f"{comparisons['planters_change']:+.1f}%"],
            ["Paiements Effectués", f"{current['total_payments']:,.0f} FCFA", f"{comparisons['payments_change']:+.1f}%"],
            ["Qualité Moyenne", f"{current['avg_quality']:.1f}/10", "-"]
        ]
        
        kpi_table = Table(kpi_data, colWidths=[7*cm, 5*cm, 4*cm])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        
        story.append(kpi_table)
        story.append(Spacer(1, 1*cm))
        
        # Top Planteurs
        story.append(Paragraph("🏆 Top 10 Planteurs", heading_style))
        
        planter_data = [["Rang", "Nom", "Volume (kg)", "Livraisons"]]
        for i, planter in enumerate(report_data["top_planters"], 1):
            planter_data.append([
                str(i),
                planter["name"],
                f"{planter['total_volume']:,.0f}",
                str(planter["delivery_count"])
            ])
        
        planter_table = Table(planter_data, colWidths=[2*cm, 7*cm, 4*cm, 3*cm])
        planter_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        
        story.append(planter_table)
        story.append(Spacer(1, 1*cm))
        
        # Alertes
        if report_data["alerts"]:
            story.append(Paragraph("⚠️ Alertes", heading_style))
            
            alert_data = [["Type", "Message"]]
            for alert in report_data["alerts"]:
                alert_data.append([
                    alert["type"].replace("_", " ").title(),
                    alert["message"]
                ])
            
            alert_table = Table(alert_data, colWidths=[4*cm, 12*cm])
            alert_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef3c7')])
            ]))
            
            story.append(alert_table)
            story.append(Spacer(1, 1*cm))
        
        # Pied de page
        story.append(Spacer(1, 2*cm))
        footer_text = f"Rapport généré automatiquement le {datetime.now().strftime('%d/%m/%Y à %H:%M')}"
        footer = Paragraph(footer_text, styles['Normal'])
        story.append(footer)
        
        # Générer le PDF
        doc.build(story)
        
        pdf_content = buffer.getvalue()
        buffer.close()
        
        logger.info(f"PDF généré: {len(pdf_content)} bytes")
        return pdf_content
