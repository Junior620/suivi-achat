-- Script pour tuer toutes les connexions actives sauf la connexion actuelle
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
AND datname = 'cocoatrack';
