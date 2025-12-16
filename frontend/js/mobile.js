/**
 * Fonctionnalités mobile et PWA
 */

// ============================================
// GESTION DE LA SIDEBAR MOBILE
// ============================================

function initMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (!sidebar || !menuBtn) return;
    
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Toggle sidebar
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    
    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // Fermer en cliquant sur un lien
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });
}

// ============================================
// SWIPE GESTURES
// ============================================

class SwipeHandler {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            threshold: 50,
            onSwipeLeft: options.onSwipeLeft || null,
            onSwipeRight: options.onSwipeRight || null,
            ...options
        };
        
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.isSwiping = false;
        
        this.init();
    }
    
    init() {
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    handleTouchStart(e) {
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
        this.isSwiping = false;
    }
    
    handleTouchMove(e) {
        if (!this.startX) return;
        
        this.currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        
        const diffX = this.currentX - this.startX;
        const diffY = currentY - this.startY;
        
        // Détecter si c'est un swipe horizontal
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
            this.isSwiping = true;
            this.element.classList.add('swiping');
            this.element.style.transform = `translateX(${diffX}px)`;
            e.preventDefault();
        }
    }
    
    handleTouchEnd() {
        if (!this.isSwiping) {
            this.reset();
            return;
        }
        
        const diffX = this.currentX - this.startX;
        
        if (Math.abs(diffX) > this.options.threshold) {
            if (diffX < 0 && this.options.onSwipeLeft) {
                this.options.onSwipeLeft(this.element);
            } else if (diffX > 0 && this.options.onSwipeRight) {
                this.options.onSwipeRight(this.element);
            }
        }
        
        this.reset();
    }
    
    reset() {
        this.element.classList.remove('swiping');
        this.element.style.transform = '';
        this.startX = 0;
        this.currentX = 0;
        this.isSwiping = false;
    }
}

// ============================================
// TABLEAUX RESPONSIVE (MODE CARTE)
// ============================================

function convertTableToCards(tableContainer) {
    const table = tableContainer.querySelector('table');
    if (!table) return;
    
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    
    const cardContainer = document.createElement('div');
    cardContainer.className = 'table-card-mode';
    
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const card = document.createElement('div');
        card.className = 'table-card swipeable';
        
        // Header de la carte (première colonne)
        const cardHeader = document.createElement('div');
        cardHeader.className = 'table-card-header';
        cardHeader.innerHTML = `
            <div class="table-card-title">${cells[0]?.textContent || ''}</div>
        `;
        card.appendChild(cardHeader);
        
        // Body de la carte (autres colonnes)
        const cardBody = document.createElement('div');
        cardBody.className = 'table-card-body';
        
        cells.slice(1, -1).forEach((cell, index) => {
            const row = document.createElement('div');
            row.className = 'table-card-row';
            row.innerHTML = `
                <span class="table-card-label">${headers[index + 1]}</span>
                <span class="table-card-value">${cell.textContent}</span>
            `;
            cardBody.appendChild(row);
        });
        
        card.appendChild(cardBody);
        
        // Actions (dernière colonne)
        const actionsCell = cells[cells.length - 1];
        if (actionsCell) {
            const cardActions = document.createElement('div');
            cardActions.className = 'table-card-actions';
            cardActions.innerHTML = actionsCell.innerHTML;
            card.appendChild(cardActions);
        }
        
        // Ajouter swipe pour supprimer
        new SwipeHandler(card, {
            onSwipeLeft: (element) => {
                element.style.transform = 'translateX(-100px)';
                element.style.background = '#ffebee';
                setTimeout(() => {
                    if (confirm('Supprimer cet élément ?')) {
                        element.remove();
                    } else {
                        element.style.transform = '';
                        element.style.background = '';
                    }
                }, 300);
            }
        });
        
        cardContainer.appendChild(card);
    });
    
    tableContainer.appendChild(cardContainer);
}

// ============================================
// PULL TO REFRESH
// ============================================

class PullToRefresh {
    constructor(container, onRefresh) {
        this.container = container;
        this.onRefresh = onRefresh;
        this.startY = 0;
        this.currentY = 0;
        this.isPulling = false;
        this.isRefreshing = false;
        
        this.init();
    }
    
    init() {
        this.container.classList.add('pull-to-refresh');
        
        const indicator = document.createElement('div');
        indicator.className = 'pull-to-refresh-indicator';
        indicator.innerHTML = '<i class="fas fa-sync-alt"></i>';
        this.container.insertBefore(indicator, this.container.firstChild);
        this.indicator = indicator;
        
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    handleTouchStart(e) {
        if (this.container.scrollTop === 0) {
            this.startY = e.touches[0].clientY;
        }
    }
    
    handleTouchMove(e) {
        if (this.isRefreshing || this.startY === 0) return;
        
        this.currentY = e.touches[0].clientY;
        const diff = this.currentY - this.startY;
        
        if (diff > 0 && this.container.scrollTop === 0) {
            this.isPulling = true;
            this.container.classList.add('pulling');
            
            if (diff > 80) {
                this.indicator.innerHTML = '<i class="fas fa-arrow-down"></i>';
            }
            
            e.preventDefault();
        }
    }
    
    async handleTouchEnd() {
        if (!this.isPulling) return;
        
        const diff = this.currentY - this.startY;
        
        if (diff > 80) {
            this.isRefreshing = true;
            this.indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            try {
                await this.onRefresh();
                showToast('✅ Données actualisées', 'success');
            } catch (error) {
                showToast('❌ Erreur lors de l\'actualisation', 'error');
            }
            
            this.isRefreshing = false;
        }
        
        this.container.classList.remove('pulling');
        this.indicator.innerHTML = '<i class="fas fa-sync-alt"></i>';
        this.isPulling = false;
        this.startY = 0;
        this.currentY = 0;
    }
}

// ============================================
// PWA INSTALLATION
// ============================================

// Utiliser une variable globale unique pour éviter les conflits
if (!window.pwaInstallPrompt) {
    window.pwaInstallPrompt = null;
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.pwaInstallPrompt = e;
    
    // Afficher un bouton d'installation
    showInstallPrompt();
});

function showInstallPrompt() {
    const installBtn = document.createElement('button');
    installBtn.className = 'btn-primary';
    installBtn.innerHTML = '<i class="fas fa-download"></i> Installer l\'application';
    installBtn.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    installBtn.addEventListener('click', async () => {
        if (!window.pwaInstallPrompt) return;
        
        window.pwaInstallPrompt.prompt();
        const { outcome } = await window.pwaInstallPrompt.userChoice;
        
        if (outcome === 'accepted') {
            showToast('✅ Application installée', 'success');
        }
        
        window.pwaInstallPrompt = null;
        installBtn.remove();
    });
    
    document.body.appendChild(installBtn);
    
    // Masquer après 10 secondes
    setTimeout(() => {
        installBtn.style.opacity = '0';
        setTimeout(() => installBtn.remove(), 300);
    }, 10000);
}

window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installée');
    showToast('✅ Application installée avec succès', 'success');
});

// ============================================
// NAVIGATION BOTTOM MOBILE
// ============================================

function initMobileBottomNav() {
    if (window.innerWidth > 768) return;
    
    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.innerHTML = `
        <a href="#dashboard" class="mobile-bottom-nav-item" data-page="dashboard">
            <i class="fas fa-home"></i>
            <span>Accueil</span>
        </a>
        <a href="#planters" class="mobile-bottom-nav-item" data-page="planters">
            <i class="fas fa-users"></i>
            <span>Planteurs</span>
        </a>
        <a href="#deliveries" class="mobile-bottom-nav-item" data-page="deliveries">
            <i class="fas fa-truck"></i>
            <span>Livraisons</span>
        </a>
        <a href="#messaging" class="mobile-bottom-nav-item" data-page="messaging">
            <i class="fas fa-comments"></i>
            <span>Messages</span>
            <span class="badge" id="messagingBadgeMobile" style="display: none;">0</span>
        </a>
        <a href="#profile" class="mobile-bottom-nav-item" data-page="profile">
            <i class="fas fa-user"></i>
            <span>Profil</span>
        </a>
    `;
    
    document.body.appendChild(nav);
    
    // Activer l'item correspondant à la page actuelle
    const updateActiveNav = () => {
        const currentPage = window.location.hash.slice(1) || 'dashboard';
        nav.querySelectorAll('.mobile-bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === currentPage);
        });
    };
    
    window.addEventListener('hashchange', updateActiveNav);
    updateActiveNav();
}

// ============================================
// TOUCH FEEDBACK
// ============================================

function addTouchFeedback() {
    document.querySelectorAll('button, .btn, a').forEach(element => {
        if (!element.classList.contains('touch-feedback')) {
            element.classList.add('touch-feedback');
        }
    });
}

// Fonction helper pour vérifier si offlineManager est prêt
function waitForOfflineManager(callback, maxAttempts = 10) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        if (window.offlineManager) {
            clearInterval(checkInterval);
            callback();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.warn('⚠️ offlineManager non disponible après', maxAttempts, 'tentatives');
        }
    }, 500);
}

// ============================================
// INITIALISATION
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobile);
} else {
    initMobile();
}

function initMobile() {
    if (window.innerWidth <= 768) {
        initMobileSidebar();
        initMobileBottomNav();
        addTouchFeedback();
        
        // Convertir les tableaux en cartes
        document.querySelectorAll('.table-container').forEach(convertTableToCards);
        
        // Ajouter pull to refresh sur le contenu principal
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            new PullToRefresh(mainContent, async () => {
                // Recharger les données de la page actuelle
                const currentPage = window.location.hash.slice(1) || 'dashboard';
                if (window[`load${currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}`]) {
                    await window[`load${currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}`]();
                }
            });
        }
    }
}

// Réinitialiser uniquement si changement significatif (mobile <-> desktop)
let lastWidth = window.innerWidth;
let resizeTimeout;

window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const currentWidth = window.innerWidth;
        const wasMobile = lastWidth <= 768;
        const isMobile = currentWidth <= 768;
        
        // Recharger uniquement si on passe de mobile à desktop ou vice-versa
        if (wasMobile !== isMobile) {
            console.log('📱 Changement mobile/desktop détecté, rechargement...');
            location.reload();
        }
        
        lastWidth = currentWidth;
    }, 500);
});
