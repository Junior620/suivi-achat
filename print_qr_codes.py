#!/usr/bin/env python3
"""
Script pour générer un PDF avec tous les QR codes pour impression
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import io
import base64

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Charger les variables d'environnement
load_dotenv('backend/.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL non trouvée dans backend/.env")
    sys.exit(1)

print("🔗 Connexion à la base de données...")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

try:
    from app.models.traceability import TraceabilityRecord
    
    db = SessionLocal()
    print("✅ Connexion établie\n")
    
    # Récupérer tous les QR codes
    records = db.query(TraceabilityRecord).order_by(TraceabilityRecord.block_number).all()
    
    if not records:
        print("⚠️  Aucun QR code trouvé")
        sys.exit(0)
    
    print(f"📦 {len(records)} QR codes trouvés")
    print("📄 Génération du PDF...\n")
    
    # Créer le PDF
    filename = "qr_codes_impression.pdf"
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    
    # Configuration de la grille (3x4 QR codes par page)
    cols = 3
    rows = 4
    qr_size = 50 * mm
    margin_x = 20 * mm
    margin_y = 20 * mm
    spacing_x = (width - 2 * margin_x - cols * qr_size) / (cols - 1)
    spacing_y = (height - 2 * margin_y - rows * qr_size) / (rows - 1)
    
    page_num = 1
    qr_count = 0
    
    for i, record in enumerate(records):
        # Calculer la position sur la grille
        row = (i % (cols * rows)) // cols
        col = (i % (cols * rows)) % cols
        
        # Nouvelle page si nécessaire
        if i > 0 and i % (cols * rows) == 0:
            c.showPage()
            page_num += 1
        
        # Position du QR code
        x = margin_x + col * (qr_size + spacing_x)
        y = height - margin_y - (row + 1) * qr_size - row * spacing_y
        
        # Décoder l'image base64
        if record.qr_code_image:
            try:
                # Extraire les données base64
                img_data = record.qr_code_image.split(',')[1]
                img_bytes = base64.b64decode(img_data)
                img = ImageReader(io.BytesIO(img_bytes))
                
                # Dessiner le QR code
                c.drawImage(img, x, y, width=qr_size, height=qr_size)
                
                # Ajouter le texte du QR code en dessous
                c.setFont("Helvetica", 8)
                text_y = y - 5 * mm
                c.drawCentredString(x + qr_size / 2, text_y, record.qr_code)
                
                # Ajouter le numéro de bloc
                c.setFont("Helvetica", 6)
                c.drawCentredString(x + qr_size / 2, text_y - 3 * mm, f"Bloc #{record.block_number}")
                
                qr_count += 1
                
            except Exception as e:
                print(f"⚠️  Erreur pour {record.qr_code}: {e}")
    
    # Ajouter les numéros de page
    for p in range(1, page_num + 1):
        c.setPage(p)
        c.setFont("Helvetica", 8)
        c.drawRightString(width - 10 * mm, 10 * mm, f"Page {p}/{page_num}")
        c.drawString(10 * mm, 10 * mm, f"CocoaTrack - QR Codes de Traçabilité")
    
    c.save()
    
    print(f"✅ PDF généré: {filename}")
    print(f"📊 {qr_count} QR codes sur {page_num} page(s)")
    print(f"\n💡 Conseils d'impression:")
    print("   - Utiliser du papier A4 blanc")
    print("   - Qualité d'impression: Haute")
    print("   - Couleur: Noir et blanc suffit")
    print("   - Découper les QR codes individuellement")
    print("   - Plastifier pour une meilleure durabilité")

except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    if 'db' in locals():
        db.close()
    engine.dispose()
