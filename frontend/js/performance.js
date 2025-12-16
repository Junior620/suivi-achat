/**
 * Module Performance & UX - CocoaTrack
 * Virtualisation, Cache, Skeleton Loaders, Lazy Loading Images
 */

// ============================================
// 1. CACHE INTELLIGENT
// ============================================
class DataCache {
    constructor() {
        this.cache = new Map();
        this.ttl = {
            planters: 5 * 60 * 1000,      // 5 minutes
            deliveries: 2 * 60 * 1000,    // 2 minutes
            warehouses: 10 * 60 * 1000,   // 10 minutes
            stats: 1 * 60 * 1000,         // 1 minute
            users: 5 * 60 * 1000          // 5 minutes
        };
    }

    generateKey(endpoint, params = {}) {
        return `${endpoint}:${JSON.stringify(params)}`;
    }

    get(endpoint, params = {}) {
        const key = this.generateKey(endpoint, params);
        const cached = this.cache.get(key);
        
        if (!cached) return null;
        
        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        console.log(`📦 Cache hit: ${endpoint}`);
        return cached.data;
    }

    set(endpoint, data, params = {}) {
        const key = this.generateKey(endpoint, params);
        const ttlKey = endpoint.split('/')[1] || 'stats';
        const ttl = this.ttl[ttlKey] || 2 * 60 * 1000;
        
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
        });
        
        console.log(`💾 Cache set: ${endpoint} (TTL: ${ttl/1000}s)`);
    }

    invalidate(pattern) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                count++;
            }
        }
        console.log(`🗑️ Cache invalidated: ${pattern} (${count} entries)`);
    }

    clear() {
        this.cache.clear();
        console.log('🧹 Cache cleared');
    }
}

// Instance globale du cache
window.dataCache = new DataCache();

// ============================================
// 2. SKELETON LOADERS
// ============================================
class SkeletonLoader {
    static card(count = 3) {
        return Array(count).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
            </div>
        `).join('');
    }

    static table(rows = 5, cols = 4) {
        const headerCells = Array(cols).fill('<div class="skeleton skeleton-cell"></div>').join('');
        const rowCells = Array(cols).fill('<div class="skeleton skeleton-cell"></div>').join('');
        const tableRows = Array(rows).fill(`<div class="skeleton-row">${rowCells}</div>`).join('');
        
        return `
            <div class="skeleton-table">
                <div class="skeleton-header">${headerCells}</div>
                ${tableRows}
            </div>
        `;
    }

    static list(count = 5) {
        return Array(count).fill(0).map(() => `
            <div class="skeleton-list-item">
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton-content">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            </div>
        `).join('');
    }

    static stats(count = 4) {
        return `<div class="skeleton-stats">${Array(count).fill(`
            <div class="skeleton-stat-card">
                <div class="skeleton skeleton-icon"></div>
                <div class="skeleton skeleton-number"></div>
                <div class="skeleton skeleton-label"></div>
            </div>
        `).join('')}</div>`;
    }

    static show(container, type = 'card', options = {}) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;
        
        el.classList.add('loading');
        
        switch(type) {
            case 'table': el.innerHTML = this.table(options.rows, options.cols); break;
            case 'list': el.innerHTML = this.list(options.count); break;
            case 'stats': el.innerHTML = this.stats(options.count); break;
            default: el.innerHTML = this.card(options.count);
        }
    }

    static hide(container) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (el) el.classList.remove('loading');
    }
}

window.SkeletonLoader = SkeletonLoader;


// ============================================
// 3. VIRTUALISATION DES LISTES
// ============================================
class VirtualList {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.itemHeight = options.itemHeight || 60;
        this.bufferSize = options.bufferSize || 5;
        this.renderItem = options.renderItem || ((item) => `<div>${JSON.stringify(item)}</div>`);
        this.items = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        
        this.init();
    }

    init() {
        if (!this.container) return;
        
        // Créer la structure
        this.container.style.overflow = 'auto';
        this.container.style.position = 'relative';
        
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-viewport';
        this.viewport.style.position = 'relative';
        
        this.content = document.createElement('div');
        this.content.className = 'virtual-content';
        this.content.style.position = 'absolute';
        this.content.style.width = '100%';
        
        this.viewport.appendChild(this.content);
        this.container.appendChild(this.viewport);
        
        // Event listener pour le scroll
        this.container.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
        
        // Observer pour le resize
        this.resizeObserver = new ResizeObserver(() => {
            this.containerHeight = this.container.clientHeight;
            this.render();
        });
        this.resizeObserver.observe(this.container);
    }

    setItems(items) {
        this.items = items;
        this.viewport.style.height = `${items.length * this.itemHeight}px`;
        this.render();
    }

    onScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }

    render() {
        if (!this.items.length) {
            this.content.innerHTML = '<div class="empty-state">Aucun élément</div>';
            return;
        }

        const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize);
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + 2 * this.bufferSize;
        const endIndex = Math.min(this.items.length, startIndex + visibleCount);

        this.content.style.top = `${startIndex * this.itemHeight}px`;
        
        const visibleItems = this.items.slice(startIndex, endIndex);
        this.content.innerHTML = visibleItems.map((item, i) => 
            `<div class="virtual-item" style="height:${this.itemHeight}px" data-index="${startIndex + i}">
                ${this.renderItem(item, startIndex + i)}
            </div>`
        ).join('');
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.container.removeEventListener('scroll', this.onScroll);
    }
}

window.VirtualList = VirtualList;

// ============================================
// 4. LAZY LOADING IMAGES
// ============================================
class LazyImageLoader {
    constructor() {
        this.observer = null;
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                (entries) => this.handleIntersection(entries),
                { rootMargin: '50px 0px', threshold: 0.01 }
            );
        }
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }

    loadImage(img) {
        const src = img.dataset.src;
        if (!src) return;

        // Créer une image temporaire pour précharger
        const tempImg = new Image();
        
        tempImg.onload = () => {
            img.src = src;
            img.classList.remove('lazy');
            img.classList.add('loaded');
        };
        
        tempImg.onerror = () => {
            img.src = 'images/placeholder.png';
            img.classList.add('error');
        };
        
        tempImg.src = src;
    }

    observe(selector = 'img.lazy') {
        const images = document.querySelectorAll(selector);
        
        if (this.observer) {
            images.forEach(img => this.observer.observe(img));
        } else {
            // Fallback pour navigateurs sans IntersectionObserver
            images.forEach(img => this.loadImage(img));
        }
    }

    // Convertir une URL d'image en WebP si supporté
    static toWebP(url) {
        if (!url || !window.supportsWebP) return url;
        
        // Si c'est déjà un WebP ou un data URL, retourner tel quel
        if (url.endsWith('.webp') || url.startsWith('data:')) return url;
        
        // Remplacer l'extension par .webp
        return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    // Détecter le support WebP
    static async detectWebPSupport() {
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                window.supportsWebP = webP.height === 2;
                resolve(window.supportsWebP);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }
}

// Initialiser le lazy loader
window.lazyImageLoader = new LazyImageLoader();
LazyImageLoader.detectWebPSupport();

// ============================================
// 5. API WRAPPER AVEC CACHE
// ============================================
const cachedApi = {
    async get(endpoint, options = {}) {
        const { useCache = true, forceRefresh = false } = options;
        
        // Vérifier le cache
        if (useCache && !forceRefresh) {
            const cached = window.dataCache.get(endpoint);
            if (cached) return cached;
        }
        
        // Appel API
        const data = await api.get(endpoint);
        
        // Mettre en cache
        if (useCache) {
            window.dataCache.set(endpoint, data);
        }
        
        return data;
    },

    async post(endpoint, body) {
        const data = await api.post(endpoint, body);
        // Invalider le cache pour ce type de données
        const cacheKey = endpoint.split('/')[1];
        window.dataCache.invalidate(cacheKey);
        return data;
    },

    async put(endpoint, body) {
        const data = await api.put(endpoint, body);
        const cacheKey = endpoint.split('/')[1];
        window.dataCache.invalidate(cacheKey);
        return data;
    },

    async delete(endpoint) {
        const data = await api.delete(endpoint);
        const cacheKey = endpoint.split('/')[1];
        window.dataCache.invalidate(cacheKey);
        return data;
    }
};

window.cachedApi = cachedApi;

// ============================================
// 6. UTILITAIRES DE PERFORMANCE
// ============================================

// Debounce pour les recherches
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle pour le scroll
function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Mesurer les performances
function measurePerformance(name, fn) {
    return async function(...args) {
        const start = performance.now();
        const result = await fn.apply(this, args);
        const duration = performance.now() - start;
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
        return result;
    };
}

window.debounce = debounce;
window.throttle = throttle;
window.measurePerformance = measurePerformance;

console.log('✅ Module Performance chargé');
