/**
 * Module de validation des données
 * Fournit des fonctions de validation réutilisables pour toute l'application
 */

const Validation = {
    /**
     * Valider un email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Valider un numéro de téléphone (format international ou local)
     */
    isValidPhone(phone) {
        // Accepte: +225XXXXXXXX, 0XXXXXXXXX, XXXXXXXXXX
        const phoneRegex = /^(\+225|0)?[0-9]{8,10}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },

    /**
     * Valider une quantité (doit être positive et numérique)
     */
    isValidQuantity(quantity) {
        const num = parseFloat(quantity);
        return !isNaN(num) && num > 0;
    },

    /**
     * Valider un prix (doit être positif et numérique)
     */
    isValidPrice(price) {
        const num = parseFloat(price);
        return !isNaN(num) && num >= 0;
    },

    /**
     * Valider une date (ne doit pas être dans le futur pour certains cas)
     */
    isValidDate(dateString, allowFuture = true) {
        const date = new Date(dateString);
        const now = new Date();
        
        if (isNaN(date.getTime())) {
            return false;
        }
        
        if (!allowFuture && date > now) {
            return false;
        }
        
        return true;
    },

    /**
     * Valider un champ requis (non vide)
     */
    isRequired(value) {
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        return value !== null && value !== undefined && value !== '';
    },

    /**
     * Valider une longueur minimale
     */
    minLength(value, min) {
        return value && value.length >= min;
    },

    /**
     * Valider une longueur maximale
     */
    maxLength(value, max) {
        return value && value.length <= max;
    },

    /**
     * Valider un nombre dans une plage
     */
    inRange(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    },

    /**
     * Afficher une erreur de validation sur un champ
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Retirer les anciennes erreurs
        this.clearFieldError(fieldId);

        // Ajouter la classe d'erreur
        field.classList.add('is-invalid');

        // Créer et ajouter le message d'erreur
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.id = `${fieldId}-error`;
        errorDiv.textContent = message;
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';

        field.parentNode.appendChild(errorDiv);
    },

    /**
     * Effacer l'erreur d'un champ
     */
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.remove('is-invalid');
        
        const errorDiv = document.getElementById(`${fieldId}-error`);
        if (errorDiv) {
            errorDiv.remove();
        }
    },

    /**
     * Valider un formulaire complet
     */
    validateForm(formId, rules) {
        let isValid = true;
        const errors = [];

        for (const [fieldId, fieldRules] of Object.entries(rules)) {
            const field = document.getElementById(fieldId);
            if (!field) continue;

            const value = field.value;

            // Effacer les anciennes erreurs
            this.clearFieldError(fieldId);

            // Appliquer chaque règle
            for (const rule of fieldRules) {
                if (!rule.validate(value)) {
                    this.showFieldError(fieldId, rule.message);
                    errors.push({ field: fieldId, message: rule.message });
                    isValid = false;
                    break; // Arrêter à la première erreur pour ce champ
                }
            }
        }

        return { isValid, errors };
    },

    /**
     * Ajouter la validation en temps réel sur un champ
     */
    addRealtimeValidation(fieldId, rules) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.addEventListener('blur', () => {
            const value = field.value;
            this.clearFieldError(fieldId);

            for (const rule of rules) {
                if (!rule.validate(value)) {
                    this.showFieldError(fieldId, rule.message);
                    break;
                }
            }
        });

        field.addEventListener('input', () => {
            // Effacer l'erreur pendant la saisie
            this.clearFieldError(fieldId);
        });
    },

    /**
     * Empêcher la saisie de valeurs négatives dans un input number
     */
    preventNegative(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.addEventListener('input', (e) => {
            if (parseFloat(e.target.value) < 0) {
                e.target.value = 0;
            }
        });

        field.addEventListener('keydown', (e) => {
            // Empêcher la saisie du signe moins
            if (e.key === '-' || e.key === 'e') {
                e.preventDefault();
            }
        });
    },

    /**
     * Formater automatiquement un numéro de téléphone
     */
    formatPhone(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Garder seulement les chiffres
            
            // Formater: XX XX XX XX XX
            if (value.length > 2) {
                value = value.match(/.{1,2}/g).join(' ');
            }
            
            e.target.value = value;
        });
    },

    /**
     * Formater automatiquement un prix avec séparateur de milliers
     */
    formatPrice(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.addEventListener('blur', (e) => {
            const value = parseFloat(e.target.value.replace(/\s/g, ''));
            if (!isNaN(value)) {
                e.target.value = value.toLocaleString('fr-FR');
            }
        });

        field.addEventListener('focus', (e) => {
            e.target.value = e.target.value.replace(/\s/g, '');
        });
    }
};

// Exporter pour utilisation globale
window.Validation = Validation;
