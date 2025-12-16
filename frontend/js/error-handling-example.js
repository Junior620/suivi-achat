/**
 * EXEMPLES D'UTILISATION DE LA GESTION D'ERREURS AMÉLIORÉE
 * 
 * Ce fichier montre comment utiliser le système de retry automatique
 * et la gestion d'erreurs améliorée dans l'application.
 */

// ============================================
// 1. RETRY AUTOMATIQUE
// ============================================

// Par défaut, toutes les requêtes ont 3 tentatives automatiques
// avec un délai exponentiel (1s, 2s, 3s)

async function exempleRetryAutomatique() {
    try {
        // Cette requête sera automatiquement retentée 3 fois en cas d'échec
        const data = await api.getPlanters();
        console.log('Données récupérées:', data);
    } catch (error) {
        // L'erreur n'est levée qu'après 3 tentatives échouées
        console.error('Échec après 3 tentatives:', error.message);
        showToast(error.message, 'error');
    }
}

// ============================================
// 2. PERSONNALISER LE NOMBRE DE TENTATIVES
// ============================================

async function exempleRetryPersonnalise() {
    try {
        // Désactiver le retry pour une requête critique
        const data = await api.request('/planters', { 
            method: 'GET',
            retries: 0  // Pas de retry
        });
        
        // Ou augmenter le nombre de tentatives
        const data2 = await api.request('/planters', { 
            method: 'GET',
            retries: 5,  // 5 tentatives
            retryDelay: 2000  // 2 secondes entre chaque tentative
        });
    } catch (error) {
        console.error('Erreur:', error.message);
    }
}

// ============================================
// 3. MESSAGES D'ERREUR EXPLICITES
// ============================================

async function exempleMessagesErreur() {
    try {
        await api.createPlanter({ name: '' });  // Données invalides
    } catch (error) {
        // L'erreur contient maintenant des informations détaillées
        console.log('Message:', error.message);  // "Données invalides. Veuillez vérifier..."
        console.log('Status:', error.status);    // 400
        console.log('Détails:', error.details);  // Objet avec les détails de l'erreur
        console.log('Endpoint:', error.endpoint); // '/planters'
        
        // Afficher un message approprié à l'utilisateur
        showToast(error.message, 'error');
    }
}

// ============================================
// 4. GESTION DES DIFFÉRENTS TYPES D'ERREURS
// ============================================

async function exempleGestionErreurs() {
    try {
        await api.updatePlanter(999, { name: 'Test' });
    } catch (error) {
        // Les erreurs sont automatiquement catégorisées
        switch (error.status) {
            case 400:
                // Données invalides
                showToast('Veuillez vérifier les données saisies', 'error');
                break;
            case 401:
                // Non authentifié (géré automatiquement par l'API)
                break;
            case 403:
                // Pas de permission
                showToast('Vous n\'avez pas les droits nécessaires', 'error');
                break;
            case 404:
                // Ressource non trouvée
                showToast('Planteur non trouvé', 'error');
                break;
            case 409:
                // Conflit (doublon)
                showToast('Ce planteur existe déjà', 'error');
                break;
            case 500:
                // Erreur serveur
                showToast('Erreur serveur, veuillez réessayer', 'error');
                break;
            default:
                // Erreur générique
                showToast(error.message, 'error');
        }
    }
}

// ============================================
// 5. MODE OFFLINE
// ============================================

async function exempleOffline() {
    try {
        // Si l'utilisateur est offline, l'API essaie automatiquement
        // de récupérer les données depuis le cache local
        const data = await api.getPlanters();
        
        if (!navigator.onLine) {
            showToast('Données chargées depuis le cache (mode offline)', 'info');
        }
    } catch (error) {
        if (!navigator.onLine) {
            showToast('Pas de connexion et pas de données en cache', 'error');
        } else {
            showToast(error.message, 'error');
        }
    }
}

// ============================================
// 6. LOGGING CÔTÉ SERVEUR
// ============================================

/*
Toutes les erreurs sont maintenant loggées côté serveur avec:
- Request ID unique
- Méthode et chemin
- Paramètres de la requête
- IP du client
- Type d'erreur
- Message d'erreur
- Stack trace complet
- Temps de traitement

Exemple de log serveur:
[12345] Erreur non gérée:
  Méthode: POST
  Chemin: /api/v1/planters
  Params: {}
  Client: 192.168.1.100
  Type: ValidationError
  Message: name field required
  Temps: 0.05s
  Traceback: ...
*/

// ============================================
// 7. BONNES PRATIQUES
// ============================================

async function bonnesPratiques() {
    try {
        // 1. Toujours utiliser try/catch pour les requêtes API
        const data = await api.getPlanters();
        
        // 2. Afficher des messages clairs à l'utilisateur
        showToast('Planteurs chargés avec succès', 'success');
        
        return data;
        
    } catch (error) {
        // 3. Logger l'erreur pour le debugging
        console.error('Erreur chargement planteurs:', error);
        
        // 4. Afficher le message d'erreur à l'utilisateur
        showToast(error.message, 'error');
        
        // 5. Retourner une valeur par défaut si nécessaire
        return { items: [], total: 0 };
    }
}

// ============================================
// 8. INDICATEUR DE CHARGEMENT AVEC RETRY
// ============================================

async function exempleAvecIndicateur() {
    const loadingToast = showToast('Chargement...', 'info', 0); // Toast permanent
    
    try {
        // La requête sera automatiquement retentée en cas d'échec
        const data = await api.getPlanters();
        
        // Fermer le toast de chargement
        if (loadingToast && loadingToast.remove) {
            loadingToast.remove();
        }
        
        showToast('Données chargées avec succès', 'success');
        return data;
        
    } catch (error) {
        // Fermer le toast de chargement
        if (loadingToast && loadingToast.remove) {
            loadingToast.remove();
        }
        
        // Afficher l'erreur
        showToast(error.message, 'error');
        throw error;
    }
}

// ============================================
// 9. GESTION D'ERREURS POUR LES FORMULAIRES
// ============================================

async function exempleFormulaire() {
    const form = document.getElementById('planterForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        // Désactiver le bouton pendant la soumission
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enregistrement...';
        
        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value
        };
        
        await api.createPlanter(formData);
        
        showToast('Planteur créé avec succès', 'success');
        form.reset();
        
    } catch (error) {
        // Afficher l'erreur spécifique
        if (error.status === 422) {
            // Erreur de validation
            showToast('Veuillez vérifier les champs du formulaire', 'error');
        } else if (error.status === 409) {
            // Doublon
            showToast('Ce planteur existe déjà', 'error');
        } else {
            // Erreur générique
            showToast(error.message, 'error');
        }
        
    } finally {
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enregistrer';
    }
}

// ============================================
// RÉSUMÉ DES AMÉLIORATIONS
// ============================================

/*
✅ Retry automatique (3 tentatives par défaut)
✅ Délai exponentiel entre les tentatives
✅ Messages d'erreur explicites et traduits
✅ Catégorisation automatique des erreurs
✅ Support du mode offline avec cache
✅ Logging détaillé côté serveur
✅ Request ID pour tracer les erreurs
✅ Temps de traitement dans les headers
✅ Pas de retry pour les erreurs 4xx (client)
✅ Retry uniquement pour les erreurs 5xx (serveur) et réseau
*/
