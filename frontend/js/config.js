/**
 * Configuration centralisée pour l'application CocoaTrack
 * Gère automatiquement les URLs selon l'environnement
 */

const AppConfig = {
    // Configuration de l'environnement
    getEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname.includes('vercel.app')) {
            return 'production';
        } else if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
            return 'local-network';
        } else {
            return 'production';
        }
    },
    
    // URL du backend API
    getApiBaseUrl() {
        const env = this.getEnvironment();
        
        switch (env) {
            case 'development':
                return 'http://localhost:8000/api/v1';
            
            case 'local-network':
                return `http://${window.location.hostname}:8000/api/v1`;
            
            case 'production':
            default:
                return 'https://cocoatrack-api-20251129203507.azurewebsites.net/api/v1';
        }
    },
    
    // URL WebSocket
    getWebSocketUrl(endpoint = '/ws/messaging') {
        const env = this.getEnvironment();
        
        switch (env) {
            case 'development':
                return `ws://localhost:8000${endpoint}`;
            
            case 'local-network':
                return `ws://${window.location.hostname}:8000${endpoint}`;
            
            case 'production':
            default:
                return `wss://cocoatrack-api-20251129203507.azurewebsites.net${endpoint}`;
        }
    },
    
    // Configuration WebSocket
    websocket: {
        maxReconnectAttempts: 10,
        reconnectBackoffMax: 60000, // 60 secondes max
        pingInterval: 30000, // 30 secondes
        useAuthorizationHeader: true // Utiliser Authorization au lieu de token
    },
    
    // Configuration de la messagerie
    messaging: {
        maxMessageLength: 5000,
        typingIndicatorTimeout: 3000,
        messageLoadLimit: 50
    },
    
    // Configuration offline
    offline: {
        syncInterval: 60000, // 1 minute
        maxRetries: 3
    },
    
    // Afficher la configuration au démarrage
    logConfig() {
        const env = this.getEnvironment();
        console.log('🔧 Configuration CocoaTrack');
        console.log('📍 Environnement:', env);
        console.log('🌐 API URL:', this.getApiBaseUrl());
        console.log('🔌 WebSocket URL:', this.getWebSocketUrl());
        console.log('⚙️  WebSocket config:', this.websocket);
    }
};

// Afficher la config au chargement
AppConfig.logConfig();

// Exporter pour utilisation globale
window.AppConfig = AppConfig;
