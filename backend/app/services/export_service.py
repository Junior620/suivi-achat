from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal
import pandas as pd
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from .delivery_service import get_deliveries
from .analytics_service import get_summary_by_planter, get_summary_by_zones, get_summary_by_quality
from ..models import Planter

def export_excel(
    db: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    planter_id: Optional[UUID] = None,
    load: Optional[str] = None,
    unload: Optional[str] = None,
    quality: Optional[str] = None
) -> BytesIO:
    output = BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Feuille 1: Données filtrées
        deliveries, _ = get_deliveries(db, from_date, to_date, planter_id, load, unload, quality, page=1, size=10000)
        data = []
        for d in deliveries:
            planter = db.query(Planter).filter(Planter.id == d.planter_id).first()
            pertes = float(d.quantity_loaded_kg) - float(d.quantity_kg)
            pct_pertes = (pertes / float(d.quantity_loaded_kg) * 100) if d.quantity_loaded_kg > 0 else 0
            data.append({
                "Planteur": planter.name if planter else "",
                "CNI": planter.cni if planter and planter.cni else "",
                "Coopérative": planter.cooperative if planter and planter.cooperative else "",
                "Date": d.date,
                "Quantité chargée (kg)": float(d.quantity_loaded_kg),
                "Quantité déchargée (kg)": float(d.quantity_kg),
                "Pertes (kg)": pertes,
                "% Pertes": round(pct_pertes, 2),
                "Lieu chargement": d.load_location,
                "Lieu déchargement": d.unload_location,
                "Qualité": d.cocoa_quality,
                "Notes": d.notes or ""
            })
        df_data = pd.DataFrame(data)
        df_data.to_excel(writer, sheet_name="Livraisons", index=False)
        
        # Feuille 2: Synthèse planteur
        summary_planter = get_summary_by_planter(db, from_date, to_date)
        df_planter = pd.DataFrame(summary_planter["items"])
        df_planter.to_excel(writer, sheet_name="Synthèse Planteur", index=False)
        
        # Feuille 3: Synthèse zones
        summary_zones = get_summary_by_zones(db, from_date, to_date, load, unload)
        df_zones = pd.DataFrame(summary_zones["items"])
        df_zones.to_excel(writer, sheet_name="Synthèse Zones", index=False)
        
        # Feuille 4: Synthèse qualité
        summary_quality = get_summary_by_quality(db, from_date, to_date, quality)
        df_quality = pd.DataFrame(summary_quality["items"])
        df_quality.to_excel(writer, sheet_name="Synthèse Qualité", index=False)
        
        # Feuille 5: Synthèse fournisseurs
        from .analytics_service import get_summary_by_fournisseur
        summary_fournisseur = get_summary_by_fournisseur(db, from_date, to_date)
        df_fournisseur = pd.DataFrame(summary_fournisseur["items"])
        df_fournisseur.to_excel(writer, sheet_name="Synthèse Fournisseurs", index=False)
        
        # Feuille 6: Collectes
        from ..models import Collecte
        collectes_query = db.query(Collecte)
        if from_date:
            collectes_query = collectes_query.filter(Collecte.date_collecte >= from_date)
        if to_date:
            collectes_query = collectes_query.filter(Collecte.date_collecte <= to_date)
        collectes = collectes_query.all()
        
        collectes_data = []
        for c in collectes:
            collectes_data.append({
                "Désignation": c.designation,
                "Fournisseur": c.chef_planteur.name if c.chef_planteur else "",
                "Coopérative": c.chef_planteur.cooperative if c.chef_planteur and c.chef_planteur.cooperative else "",
                "Date collecte": c.date_collecte,
                "Quantité chargée (kg)": float(c.quantity_loaded_kg),
                "Date chargement": c.load_date,
                "Quantité déchargée (kg)": float(c.quantity_unloaded_kg),
                "Date déchargement": c.unload_date,
                "Pertes (kg)": c.pertes_kg,
                "% Pertes": round(c.pourcentage_pertes, 2),
                "Suivi": c.suivi or ""
            })
        df_collectes = pd.DataFrame(collectes_data)
        df_collectes.to_excel(writer, sheet_name="Collectes", index=False)
    
    output.seek(0)
    return output

def export_pdf(
    db: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    load: Optional[str] = None,
    unload: Optional[str] = None,
    quality: Optional[str] = None
) -> BytesIO:
    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # En-tête
    title = Paragraph("<b>Rapport de Synthèse - Livraisons de Cacao</b>", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 12))
    
    date_str = f"Généré le {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    elements.append(Paragraph(date_str, styles['Normal']))
    
    if from_date or to_date:
        period = f"Période: {from_date or 'Début'} - {to_date or 'Fin'}"
        elements.append(Paragraph(period, styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Synthèse planteur
    elements.append(Paragraph("<b>Synthèse par Planteur</b>", styles['Heading2']))
    summary_planter = get_summary_by_planter(db, from_date, to_date)
    data_planter = [["Planteur", "Chargé (kg)", "Déchargé (kg)", "Pertes (kg)"]]
    for item in summary_planter["items"]:
        data_planter.append([
            item["planter"],
            f"{item.get('total_loaded_kg', item['total_kg']):.2f}",
            f"{item['total_kg']:.2f}",
            f"{item.get('total_loaded_kg', item['total_kg']) - item['total_kg']:.2f}"
        ])
    data_planter.append([
        "TOTAL",
        "",
        f"{summary_planter['total_general']:.2f}",
        ""
    ])
    
    table = Table(data_planter)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Synthèse zones
    elements.append(Paragraph("<b>Synthèse par Zone</b>", styles['Heading2']))
    summary_zones = get_summary_by_zones(db, from_date, to_date, load, unload)
    data_zones = [["Planteur", "Zone", "Chargé (kg)", "Déchargé (kg)"]]
    for item in summary_zones["items"]:
        data_zones.append([
            item["planter"],
            item["location"],
            f"{item['total_loaded_kg']:.2f}",
            f"{item['total_unloaded_kg']:.2f}"
        ])
    data_zones.append([
        "TOTAL",
        "",
        f"{summary_zones['total_loaded']:.2f}",
        f"{summary_zones['total_unloaded']:.2f}"
    ])
    
    table = Table(data_zones)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Synthèse qualité
    elements.append(Paragraph("<b>Synthèse par Qualité</b>", styles['Heading2']))
    summary_quality = get_summary_by_quality(db, from_date, to_date, quality)
    data_quality = [["Planteur", "Total (kg)"]]
    for item in summary_quality["items"]:
        data_quality.append([item["planter"], f"{item['total_unloaded_kg']:.2f}"])
    data_quality.append(["TOTAL", f"{summary_quality['total']:.2f}"])
    
    table = Table(data_quality)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Synthèse fournisseurs
    from .analytics_service import get_summary_by_fournisseur
    elements.append(Paragraph("<b>Synthèse par Fournisseur</b>", styles['Heading2']))
    summary_fournisseur = get_summary_by_fournisseur(db, from_date, to_date)
    data_fournisseur = [["Fournisseur", "Chargé (kg)", "Déchargé (kg)", "Pertes (kg)", "% Utilisation"]]
    for item in summary_fournisseur["items"]:
        data_fournisseur.append([
            item["fournisseur"],
            f"{item['total_loaded_kg']:.2f}",
            f"{item['total_unloaded_kg']:.2f}",
            f"{item['pertes_kg']:.2f}",
            f"{item['pct_utilisation']:.1f}%"
        ])
    data_fournisseur.append([
        "TOTAL",
        f"{summary_fournisseur['total_loaded']:.2f}",
        f"{summary_fournisseur['total_unloaded']:.2f}",
        f"{summary_fournisseur['total_pertes']:.2f}",
        f"{summary_fournisseur['pct_utilisation_global']:.1f}%"
    ])
    
    table = Table(data_fournisseur)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    
    doc.build(elements)
    output.seek(0)
    return output
