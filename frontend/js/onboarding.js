// Système d'onboarding et tour guidé pour CocoaTrack

class OnboardingTour {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;
        
        // Définir les étapes du tour selon la page
        this.tours = {
            dashboard: [
                {
                    target: '.kpi-grid',
                    title: '📊 Tableau de bord',
                    content: 'Visualisez vos KPIs en temps réel : volume total, nombre de livraisons, moyenne et planteurs actifs.',
                    position: 'bottom'
                },
                {
                    target: '#evolutionChart',
                    title: '📈 Graphiques',
                    content: 'Suivez l\'évolution de vos livraisons sur différentes périodes.',
                    position: 'top'
                }
            ],
            planters: [
                {
                    target: '#addPlanterBtn',
                    title: '👨‍🌾 Ajouter un planteur',
                    content: 'Cliquez ici pour enregistrer un nouveau planteur dans le système.',
                    position: 'bottom'
                },
                {
                    target: '#plantersTable',
                    title: '📋 Liste des planteurs',
                    content: 'Gérez tous vos planteurs : recherche, filtres, modification et suppression.',
                    position: 'top'
                },
                {
                    target: '.search-container',
                    title: '🔍 Recherche avancée',
                    content: 'Utilisez la recherche globale pour trouver rapidement planteurs, livraisons et collectes.',
                    position: 'bottom'
                }
            ],
            deliveries: [
                {
                    target: '#addDeliveryBtn',
                    title: '📦 Nouvelle livraison',
                    content: 'Enregistrez une nouvelle livraison de cacao avec tous les détails.',
                    position: 'bottom'
                },
                {
                    target: '.filters-container',
                    title: '🎯 Filtres',
                    content: 'Filtrez les livraisons par date, zone, qualité ou planteur.',
                    position: 'bottom'
                },
                {
                    target: '.export-buttons',
                    title: '📥 Export',
                    content: 'Exportez vos données en Excel ou PDF pour vos rapports.',
                    position: 'left'
                }
            ],
            payments: [
                {
                    target: '#addPaymentBtn',
                    title: '💰 Nouveau paiement',
                    content: 'Enregistrez un paiement à un planteur (espèces, virement ou chèque).',
                    position: 'bottom'
                },
                {
                    target: '#paymentsTable',
                    title: '💳 Historique',
                    content: 'Consultez l\'historique complet des paiements et les soldes.',
                    position: 'top'
                }
            ]
        };
    }

    // Démarrer le tour pour une page spécifique
    start(pageName) {
        if (!this.tours[pageName] || this.tours[pageName].length === 0) {
            console.log('Pas de tour disponible pour cette page');
            return;
        }

        // Vérifier si l'utilisateur a déjà vu ce tour
        const tourKey = `tour_${pageName}_completed`;
        if (localStorage.getItem(tourKey) === 'true') {
            return; // Ne pas afficher si déjà vu
        }

        this.currentTour = this.tours[pageName];
        this.currentStep = 0;
        this.isActive = true;
        this.createOverlay();
        this.showStep(0);
    }

    // Créer l'overlay sombre
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        this.overlay.innerHTML = `
            <div class="onboarding-skip">
                <button onclick="onboardingTour.skip()" class="skip-btn">
                    Passer le tutoriel ⏭️
                </button>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    // Afficher une étape
    showStep(stepIndex) {
        if (stepIndex >= this.currentTour.length) {
            this.complete();
            return;
        }

        const step = this.currentTour[stepIndex];
        const targetElement = document.querySelector(step.target);

        if (!targetElement) {
            console.warn(`Élément ${step.target} non trouvé, passage à l'étape suivante`);
            this.next();
            return;
        }

        // Mettre en surbrillance l'élément cible
        this.highlightElement(targetElement);

        // Créer ou mettre à jour le tooltip
        this.showTooltip(step, targetElement);
    }

    // Mettre en surbrillance un élément
    highlightElement(element) {
        // Retirer l'ancienne surbrillance
        const oldHighlight = document.querySelector('.onboarding-highlight');
        if (oldHighlight) {
            oldHighlight.classList.remove('onboarding-highlight');
        }

        // Ajouter la nouvelle surbrillance
        element.classList.add('onboarding-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Afficher le tooltip
    showTooltip(step, targetElement) {
        // Supprimer l'ancien tooltip
        if (this.tooltip) {
            this.tooltip.remove();
        }

        // Créer le nouveau tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'onboarding-tooltip';
        this.tooltip.innerHTML = `
            <div class="tooltip-header">
                <h3>${step.title}</h3>
                <button onclick="onboardingTour.skip()" class="tooltip-close">✕</button>
            </div>
            <div class="tooltip-content">
                <p>${step.content}</p>
            </div>
            <div class="tooltip-footer">
                <div class="tooltip-progress">
                    ${this.currentStep + 1} / ${this.currentTour.length}
                </div>
                <div class="tooltip-buttons">
                    ${this.currentStep > 0 ? '<button onclick="onboardingTour.previous()" class="btn-secondary">← Précédent</button>' : ''}
                    <button onclick="onboardingTour.next()" class="btn-primary">
                        ${this.currentStep < this.currentTour.length - 1 ? 'Suivant →' : 'Terminer ✓'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.tooltip);

        // Positionner le tooltip
        this.positionTooltip(targetElement, step.position);
    }

    // Positionner le tooltip par rapport à l'élément cible
    positionTooltip(targetElement, position) {
        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 20;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = rect.bottom + 20;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left - tooltipRect.width - 20;
                break;
            case 'right':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + 20;
                break;
            default:
                top = rect.bottom + 20;
                left = rect.left;
        }

        // Ajuster si hors de l'écran
        if (top < 10) top = 10;
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    // Étape suivante
    next() {
        this.currentStep++;
        this.showStep(this.currentStep);
    }

    // Étape précédente
    previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    // Passer le tour
    skip() {
        if (confirm('Voulez-vous vraiment passer le tutoriel ? Vous pourrez le relancer depuis le menu Aide.')) {
            this.complete();
        }
    }

    // Terminer le tour
    complete() {
        this.isActive = false;

        // Retirer la surbrillance
        const highlight = document.querySelector('.onboarding-highlight');
        if (highlight) {
            highlight.classList.remove('onboarding-highlight');
        }

        // Retirer l'overlay et le tooltip
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }

        // Marquer comme complété
        const pageName = Object.keys(this.tours).find(key => this.tours[key] === this.currentTour);
        if (pageName) {
            localStorage.setItem(`tour_${pageName}_completed`, 'true');
        }

        showToast('✓ Tutoriel terminé !', 'success');
    }

    // Réinitialiser tous les tours
    resetAll() {
        Object.keys(this.tours).forEach(pageName => {
            localStorage.removeItem(`tour_${pageName}_completed`);
        });
        showToast('Tours réinitialisés. Rechargez la page pour les revoir.', 'success');
    }
}

// Tooltips interactifs pour les éléments de l'interface
class InteractiveTooltips {
    constructor() {
        this.tooltips = {
            // Dashboard
            '#kpiVolume': 'Volume total de cacao collecté sur la période sélectionnée',
            '#kpiLivraisons': 'Nombre total de livraisons enregistrées',
            '#kpiMoyenne': 'Poids moyen par livraison',
            '#kpiPlanteurs': 'Nombre de planteurs ayant effectué au moins une livraison',
            
            // Planters
            '.planter-status': 'Statut du planteur : actif ou inactif',
            '.planter-stats': 'Statistiques de production du planteur',
            
            // Deliveries
            '.quality-badge': 'Qualité du cacao : Grade 1 (meilleur) à Grade 3',
            '.delivery-status': 'Statut de la livraison',
            
            // Payments
            '.payment-method': 'Mode de paiement : Espèces, Virement ou Chèque',
            '.balance-amount': 'Solde restant dû au planteur'
        };
    }

    // Initialiser les tooltips
    init() {
        Object.keys(this.tooltips).forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                this.addTooltip(element, this.tooltips[selector]);
            });
        });
    }

    // Ajouter un tooltip à un élément
    addTooltip(element, text) {
        element.setAttribute('data-tooltip', text);
        element.classList.add('has-tooltip');

        element.addEventListener('mouseenter', (e) => this.showTooltip(e, text));
        element.addEventListener('mouseleave', () => this.hideTooltip());
    }

    // Afficher le tooltip
    showTooltip(event, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'interactive-tooltip';
        tooltip.textContent = text;
        tooltip.id = 'active-tooltip';
        document.body.appendChild(tooltip);

        const rect = event.target.getBoundingClientRect();
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
        tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
    }

    // Masquer le tooltip
    hideTooltip() {
        const tooltip = document.getElementById('active-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
}

// Système d'aide avec vidéos tutoriels
class HelpSystem {
    constructor() {
        this.videos = {
            'getting-started': {
                title: 'Démarrage rapide',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Remplacer par vraie vidéo
                description: 'Découvrez les fonctionnalités principales de CocoaTrack'
            },
            'add-planter': {
                title: 'Ajouter un planteur',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                description: 'Comment enregistrer un nouveau planteur'
            },
            'record-delivery': {
                title: 'Enregistrer une livraison',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                description: 'Processus d\'enregistrement d\'une livraison'
            },
            'payments': {
                title: 'Gérer les paiements',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                description: 'Comment effectuer et suivre les paiements'
            }
        };
    }

    // Afficher le centre d'aide
    showHelpCenter() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content help-center">
                <div class="modal-header">
                    <h2>🎓 Centre d'aide CocoaTrack</h2>
                    <button onclick="this.closest('.modal-overlay').remove()" class="close-btn">✕</button>
                </div>
                <div class="modal-body">
                    <div class="help-sections">
                        <div class="help-section">
                            <h3>📚 Tutoriels vidéo</h3>
                            <div class="video-grid">
                                ${Object.keys(this.videos).map(key => {
                                    const video = this.videos[key];
                                    return `
                                        <div class="video-card" onclick="helpSystem.playVideo('${key}')">
                                            <div class="video-thumbnail">▶️</div>
                                            <h4>${video.title}</h4>
                                            <p>${video.description}</p>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <div class="help-section">
                            <h3>🎯 Tours guidés</h3>
                            <div class="tour-list">
                                <button onclick="onboardingTour.resetAll(); onboardingTour.start('dashboard')" class="tour-btn">
                                    📊 Tour du tableau de bord
                                </button>
                                <button onclick="onboardingTour.resetAll(); onboardingTour.start('planters')" class="tour-btn">
                                    👨‍🌾 Tour des planteurs
                                </button>
                                <button onclick="onboardingTour.resetAll(); onboardingTour.start('deliveries')" class="tour-btn">
                                    📦 Tour des livraisons
                                </button>
                                <button onclick="onboardingTour.resetAll(); onboardingTour.start('payments')" class="tour-btn">
                                    💰 Tour des paiements
                                </button>
                            </div>
                        </div>

                        <div class="help-section">
                            <h3>❓ FAQ</h3>
                            <div class="faq-list">
                                <details>
                                    <summary>Comment ajouter un nouveau planteur ?</summary>
                                    <p>Allez dans la section Planteurs, cliquez sur "Ajouter un planteur", remplissez le formulaire et validez.</p>
                                </details>
                                <details>
                                    <summary>Comment enregistrer une livraison ?</summary>
                                    <p>Dans Livraisons, cliquez sur "Nouvelle livraison", sélectionnez le planteur, entrez les détails et enregistrez.</p>
                                </details>
                                <details>
                                    <summary>Comment exporter les données ?</summary>
                                    <p>Utilisez les boutons d'export en haut à droite pour télécharger en Excel ou PDF.</p>
                                </details>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Lire une vidéo
    playVideo(videoKey) {
        const video = this.videos[videoKey];
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content video-modal">
                <div class="modal-header">
                    <h2>${video.title}</h2>
                    <button onclick="this.closest('.modal-overlay').remove()" class="close-btn">✕</button>
                </div>
                <div class="modal-body">
                    <div class="video-container">
                        <iframe 
                            width="100%" 
                            height="450" 
                            src="${video.url}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                    <p>${video.description}</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Initialiser les systèmes
const onboardingTour = new OnboardingTour();
const interactiveTooltips = new InteractiveTooltips();
const helpSystem = new HelpSystem();

// Fonction pour démarrer le tour au premier chargement
function checkFirstVisit() {
    const isFirstVisit = !localStorage.getItem('app_visited');
    if (isFirstVisit) {
        localStorage.setItem('app_visited', 'true');
        // Attendre que la page soit chargée
        setTimeout(() => {
            onboardingTour.start('dashboard');
        }, 1000);
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    interactiveTooltips.init();
    checkFirstVisit();
});
