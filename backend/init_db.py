from app.database import Base, engine
from app.models import user, planter, delivery, payment, notification, traceability

print("Création des tables dans la base de données locale...")

try:
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées avec succès!")
    
    # Afficher les tables
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\nTables créées ({len(tables)}):")
    for table in sorted(tables):
        print(f"  - {table}")
        
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
