"""
Script de test pour vérifier la connexion à PostgreSQL local
"""
import sys
from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal, engine
from app.models import User, Planter, Delivery
from sqlalchemy import text

def test_connection():
    print("🔍 Test de connexion à PostgreSQL local (pgAdmin)...\n")
    
    try:
        # Test 1: Connexion basique
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Connexion réussie !")
            print(f"   PostgreSQL version: {version[:50]}...\n")
        
        # Test 2: Vérifier les tables
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result]
            
            if tables:
                print(f"✅ Tables trouvées ({len(tables)}):")
                for table in tables:
                    print(f"   - {table}")
            else:
                print("⚠️  Aucune table trouvée. Exécutez: alembic upgrade head")
            print()
        
        # Test 3: Compter les enregistrements
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            planter_count = db.query(Planter).count()
            delivery_count = db.query(Delivery).count()
            
            print("✅ Données actuelles:")
            print(f"   - Users: {user_count}")
            print(f"   - Planters: {planter_count}")
            print(f"   - Deliveries: {delivery_count}")
            
            if user_count == 0:
                print("\n💡 Aucune donnée. Exécutez: python seed.py")
            else:
                print("\n✅ Base de données prête !")
                
                # Afficher quelques planteurs
                if planter_count > 0:
                    print("\n📋 Planteurs dans la base:")
                    planters = db.query(Planter).limit(5).all()
                    for p in planters:
                        print(f"   - {p.name} ({p.phone or 'pas de téléphone'})")
        finally:
            db.close()
        
        print("\n" + "="*60)
        print("🎯 TOUT EST CONFIGURÉ !")
        print("="*60)
        print("\n✅ Toutes les modifications via l'app vont dans pgAdmin")
        print("✅ Vous pouvez voir les données en temps réel dans pgAdmin")
        print("✅ Vous pouvez modifier directement dans pgAdmin")
        print("\n💡 Pour voir les changements dans pgAdmin:")
        print("   1. Ouvrez pgAdmin")
        print("   2. Connectez-vous à votre serveur PostgreSQL")
        print("   3. Allez dans: cocoa_db → Schemas → public → Tables")
        print("   4. Clic droit sur une table → View/Edit Data → All Rows")
        print("   5. Cliquez sur 'Refresh' (F5) pour voir les nouveaux changements")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        print("\n💡 Vérifiez que:")
        print("   1. PostgreSQL est démarré")
        print("   2. La base 'cocoa_db' existe dans pgAdmin")
        print("   3. Les informations dans backend/.env sont correctes")
        return False
    
    return True

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
