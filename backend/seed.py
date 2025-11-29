import os
import sys
from datetime import date, timedelta
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models import User, Planter, Delivery
from app.utils.security import hash_password

def seed_database():
    db = SessionLocal()
    
    try:
        # Vérifier si déjà seedé
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping...")
            return
        
        # Créer utilisateurs
        users = [
            User(email="admin@cocoa.com", password_hash=hash_password("admin123"), role="admin"),
            User(email="manager@cocoa.com", password_hash=hash_password("manager123"), role="manager"),
            User(email="viewer@cocoa.com", password_hash=hash_password("viewer123"), role="viewer"),
        ]
        db.add_all(users)
        db.commit()
        print("✓ Users created")
        
        # Créer planteurs
        planters = [
            Planter(name="Jean Kouassi", phone="+225 07 12 34 56 78"),
            Planter(name="Marie Koné", phone="+225 05 98 76 54 32"),
            Planter(name="Amadou Traoré", phone="+225 01 23 45 67 89"),
            Planter(name="Fatou Diallo", phone="+225 07 11 22 33 44"),
            Planter(name="Yao N'Guessan", phone="+225 05 55 66 77 88"),
        ]
        db.add_all(planters)
        db.commit()
        print("✓ Planters created")
        
        # Créer livraisons
        qualities = ["Grade 1", "Grade 2", "Grade 3", "Premium", "Standard"]
        load_locations = ["Abidjan", "San Pedro", "Daloa", "Yamoussoukro", "Bouaké"]
        unload_locations = ["Port Abidjan", "Port San Pedro", "Entrepôt Central", "Usine Daloa"]
        
        deliveries = []
        base_date = date.today() - timedelta(days=90)
        
        for i in range(40):
            planter = planters[i % len(planters)]
            delivery_date = base_date + timedelta(days=i * 2)
            quantity = Decimal(str(round(500 + (i * 37.5) % 2000, 2)))
            
            deliveries.append(Delivery(
                planter_id=planter.id,
                date=delivery_date,
                quantity_kg=quantity,
                load_location=load_locations[i % len(load_locations)],
                unload_location=unload_locations[i % len(unload_locations)],
                cocoa_quality=qualities[i % len(qualities)],
                notes=f"Livraison #{i+1}" if i % 3 == 0 else None
            ))
        
        db.add_all(deliveries)
        db.commit()
        print("✓ Deliveries created")
        
        print("\n✅ Database seeded successfully!")
        print("\nTest users:")
        print("  Admin:   admin@cocoa.com / admin123")
        print("  Manager: manager@cocoa.com / manager123")
        print("  Viewer:  viewer@cocoa.com / viewer123")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
