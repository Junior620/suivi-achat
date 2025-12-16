/**
 * EXEMPLE D'UTILISATION DU MODULE DE VALIDATION
 * 
 * Ce fichier montre comment utiliser le module validation.js
 * dans le formulaire de planteur
 */

// ============================================
// EXEMPLE 1: Validation simple d'un formulaire
// ============================================

function validatePlanterForm() {
    // Définir les règles de validation
    const rules = {
        'name': [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'Le nom est obligatoire'
            },
            {
                validate: (value) => Validation.minLength(value, 2),
                message: 'Le nom doit contenir au moins 2 caractères'
            }
        ],
        'phone': [
            {
                validate: (value) => !value || Validation.isValidPhone(value),
                message: 'Format de téléphone invalide (ex: 0712345678 ou +225 07 12 34 56 78)'
            }
        ],
        'superficie': [
            {
                validate: (value) => !value || Validation.isValidQuantity(value),
                message: 'La superficie doit être un nombre positif'
            }
        ]
    };

    // Valider le formulaire
    const result = Validation.validateForm('planterForm', rules);

    if (!result.isValid) {
        showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
        return false;
    }

    return true;
}

// ============================================
// EXEMPLE 2: Validation en temps réel
// ============================================

function setupRealtimeValidation() {
    // Validation du nom en temps réel
    Validation.addRealtimeValidation('name', [
        {
            validate: (value) => Validation.isRequired(value),
            message: 'Le nom est obligatoire'
        },
        {
            validate: (value) => Validation.minLength(value, 2),
            message: 'Le nom doit contenir au moins 2 caractères'
        }
    ]);

    // Validation du téléphone en temps réel
    Validation.addRealtimeValidation('phone', [
        {
            validate: (value) => !value || Validation.isValidPhone(value),
            message: 'Format de téléphone invalide'
        }
    ]);

    // Empêcher les valeurs négatives pour la superficie
    Validation.preventNegative('superficie');

    // Formater automatiquement le téléphone
    Validation.formatPhone('phone');
}

// ============================================
// EXEMPLE 3: Validation d'une livraison
// ============================================

function validateDeliveryForm() {
    const rules = {
        'quantity': [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'La quantité est obligatoire'
            },
            {
                validate: (value) => Validation.isValidQuantity(value),
                message: 'La quantité doit être un nombre positif'
            },
            {
                validate: (value) => Validation.inRange(value, 1, 10000),
                message: 'La quantité doit être entre 1 et 10000 kg'
            }
        ],
        'price': [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'Le prix est obligatoire'
            },
            {
                validate: (value) => Validation.isValidPrice(value),
                message: 'Le prix doit être un nombre positif ou zéro'
            }
        ],
        'delivery_date': [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'La date de livraison est obligatoire'
            },
            {
                validate: (value) => Validation.isValidDate(value, false),
                message: 'La date ne peut pas être dans le futur'
            }
        ]
    };

    return Validation.validateForm('deliveryForm', rules);
}

// ============================================
// EXEMPLE 4: Validation d'un paiement
// ============================================

function validatePaymentForm() {
    const rules = {
        'amount': [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'Le montant est obligatoire'
            },
            {
                validate: (value) => Validation.isValidPrice(value),
                message: 'Le montant doit être un nombre positif'
            },
            {
                validate: (value) => parseFloat(value) > 0,
                message: 'Le montant doit être supérieur à 0'
            }
        ],
        'payment_method': [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'Le mode de paiement est obligatoire'
            }
        ],
        'payment_date': [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'La date de paiement est obligatoire'
            },
            {
                validate: (value) => Validation.isValidDate(value, false),
                message: 'La date ne peut pas être dans le futur'
            }
        ]
    };

    return Validation.validateForm('paymentForm', rules);
}

// ============================================
// EXEMPLE 5: Validation personnalisée
// ============================================

function validateCustom() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    let isValid = true;

    // Valider l'email
    if (!Validation.isValidEmail(email)) {
        Validation.showFieldError('email', 'Email invalide');
        isValid = false;
    }

    // Valider le mot de passe
    if (!Validation.minLength(password, 8)) {
        Validation.showFieldError('password', 'Le mot de passe doit contenir au moins 8 caractères');
        isValid = false;
    }

    // Vérifier que les mots de passe correspondent
    if (password !== confirmPassword) {
        Validation.showFieldError('confirmPassword', 'Les mots de passe ne correspondent pas');
        isValid = false;
    }

    return isValid;
}

// ============================================
// INITIALISATION
// ============================================

// Appeler cette fonction quand le formulaire est chargé
function initFormValidation() {
    // Setup validation en temps réel
    setupRealtimeValidation();

    // Empêcher les valeurs négatives sur tous les champs numériques
    document.querySelectorAll('input[type="number"]').forEach(input => {
        if (input.id) {
            Validation.preventNegative(input.id);
        }
    });

    // Formater automatiquement les prix
    const priceFields = ['price', 'amount', 'unit_price'];
    priceFields.forEach(fieldId => {
        if (document.getElementById(fieldId)) {
            Validation.formatPrice(fieldId);
        }
    });

    // Ajouter la validation au submit du formulaire
    const form = document.getElementById('planterForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (validatePlanterForm()) {
                // Le formulaire est valide, on peut soumettre
                console.log('Formulaire valide, soumission...');
                // submitForm();
            }
        });
    }
}

// Exporter les fonctions
window.ValidationExamples = {
    validatePlanterForm,
    validateDeliveryForm,
    validatePaymentForm,
    validateCustom,
    initFormValidation
};
