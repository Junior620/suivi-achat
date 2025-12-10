-- Script pour créer l'utilisateur admin
-- À exécuter dans Azure Portal > PostgreSQL > Query editor

INSERT INTO users (id, email, password, name, role, is_active)
VALUES (
    gen_random_uuid(),
    'admin@cocoatrack.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q0OXm',
    'Administrateur',
    'admin',
    true
);

-- Vérifier que l'utilisateur a été créé
SELECT id, email, name, role, is_active FROM users WHERE email = 'admin@cocoatrack.com';
