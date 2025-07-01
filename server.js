require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Datos de demo (en producción usarías una base de datos)
let performers = [
    {
        id: 'perf_luna_001',
        name: 'Luna Estrella',
        email: 'luna@example.com',
        specialty: 'Baile Contemporáneo',
        isLive: true,
        isVerified: true,
        currentViewers: 156,
        subscribers: 1250,
        todayEarnings: 45000,
        avatar: 'https://images.unsplash.com/photo-1594736797933-d0280ba88ba5?w=300',
        personalRoom: 'https://teams.webex.com/meet/luna-estrella',
        welcomeMessage: '¡Hola! Soy Luna, bienvenidos a mi show de baile 💃✨',
        tags: ['baile', 'contemporáneo', 'música'],
        lastConnection: new Date().toISOString(),
        paymentMethods: {
            bold: { accountId: 'bold_luna_001', configured: true },
            paypal: { email: 'luna@paypal.com', configured: true }
        }
    },
    {
        id: 'perf_miguel_002',
        name: 'Miguel Flow',
        email: 'miguel@example.com',
        specialty: 'Comedia y Chat',
        isLive: false,
        isVerified: true,
        currentViewers: 0,
        subscribers: 890,
        todayEarnings: 32000,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        personalRoom: 'https://teams.webex.com/meet/miguel-flow',
        welcomeMessage: '¡Ey qué tal! Soy Miguel, prepárense para reír 😂🎭',
        tags: ['comedia', 'chat', 'humor'],
        lastConnection: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        paymentMethods: {
            bold: { accountId: 'bold_miguel_002', configured: true }
        }
    },
    {
        id: 'perf_sofia_003',
        name: 'Sofía Música',
        email: 'sofia@example.com',
        specialty: 'Música en Vivo',
        isLive: true,
        isVerified: false,
        currentViewers: 89,
        subscribers: 445,
        todayEarnings: 23000,
        avatar: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
        personalRoom: 'https://teams.webex.com/meet/sofia-musica',
        welcomeMessage: '🎵 ¡Hola! Canto y toco guitarra para ustedes',
        tags: ['música', 'guitarra', 'canto'],
        lastConnection: new Date().toISOString(),
        paymentMethods: {
            paypal: { email: 'sofia@paypal.com', configured: true }
        }
    }
];

// Middleware de compresión
app.use(compression());

// Headers de seguridad específicos para Webex
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://binaries.webex.com",
                "https://teams.webex.com",
                "https://js.stripe.com",
                "https://www.paypal.com",
                "https://checkout.bold.co"
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'", 
                "https:", 
                "wss:",
                "https://*.webex.com",
                "wss://*.webex.com",
                "https://api.bold.co",
                "https://api.paypal.com"
            ],
            fontSrc: ["'self'", "https:"],
            frameSrc: [
                "'self'",
                "https://*.webex.com",
                "https://teams.webex.com",
                "https://js.stripe.com",
                "https://www.paypal.com",
                "https://checkout.bold.co"
            ],
            frameAncestors: [
                "'self'",
                "https://*.webex.com",
                "https://teams.webex.com"
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "https:", "blob:", "data:"],
            workerSrc: ["'self'", "blob:"]
        }
    },
    frameOptions: false,
    crossOriginEmbedderPolicy: false
}));

// Headers adicionales para Webex
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// CORS configurado para Webex
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://teams.webex.com",
        "https://*.webex.com",
        "https://pnptv-live-production.up.railway.app",
        process.env.RAILWAY_URL,
        process.env.BASE_URL
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// RUTAS PRINCIPALES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/embedded', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/shared', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shared.html'));
});

app.get('/performer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'performer.html'));
});

// Agregar estas líneas después de la línea 86 (después del logging middleware)

// =============================================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// =============================================================================

// Middleware para verificar autenticación de admin
function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide admin credentials'
        });
    }
    
    // Decodificar credenciales Basic Auth
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    // Verificar credenciales
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
        console.error('❌ ADMIN_PASSWORD not configured in environment');
        return res.status(500).json({
            error: 'Admin password not configured',
            message: 'Contact system administrator'
        });
    }
    
    if (username === adminUsername && password === adminPassword) {
        console.log(`✅ Admin authenticated: ${username}`);
        next();
    } else {
        console.log(`❌ Failed admin login attempt: ${username}`);
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).json({
            error: 'Invalid credentials',
            message: 'Username or password incorrect'
        });
    }
}

// CAMBIAR LA RUTA /admin EXISTENTE (línea ~105) POR ESTA:

app.get('/admin', requireAdminAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>PNPtv Live - Admin Panel</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    color: white;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: rgba(255,255,255,0.1);
                    border-radius: 15px;
                    padding: 30px;
                    backdrop-filter: blur(10px);
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 2.5em;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 40px;
                }
                .stat-card {
                    background: rgba(255,255,255,0.2);
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                }
                .stat-number {
                    font-size: 2em;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }
                .action-btn {
                    background: rgba(255,255,255,0.2);
                    border: 2px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    text-decoration: none;
                    text-align: center;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    font-size: 16px;
                }
                .action-btn:hover {
                    background: rgba(255,255,255,0.3);
                    transform: translateY(-2px);
                }
                .logs {
                    background: rgba(0,0,0,0.3);
                    padding: 20px;
                    border-radius: 10px;
                    margin-top: 20px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .performer-card {
                    background: rgba(255,255,255,0.15);
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .performer-info {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .status-badge {
                    padding: 5px 10px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                }
                .status-live {
                    background: #22c55e;
                    color: white;
                }
                .status-offline {
                    background: #6b7280;
                    color: white;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎬 PNPtv Live - Admin Panel</h1>
                    <p>Welcome to the administration dashboard</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number" id="online-performers">-</div>
                        <div>Online Performers</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="total-viewers">-</div>
                        <div>Total Viewers</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="revenue-today">-</div>
                        <div>Revenue Today</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="active-rooms">-</div>
                        <div>Total Performers</div>
                    </div>
                </div>
                
                <div class="actions-grid">
                    <a href="/admin/performers" class="action-btn">👥 Manage Performers</a>
                    <a href="/admin/payments" class="action-btn">💳 View Payments</a>
                    <a href="/admin/analytics" class="action-btn">📊 Analytics</a>
                    <a href="/admin/settings" class="action-btn">⚙️ Settings</a>
                    <a href="/admin/webhooks" class="action-btn">🔗 Webhooks Status</a>
                    <a href="/health" class="action-btn">🏥 Health Check</a>
                </div>
                
                <div class="logs">
                    <h3>📊 Live Performers Status</h3>
                    <div id="performers-content">Loading performers...</div>
                </div>
                
                <div class="logs">
                    <h3>🔗 System Status</h3>
                    <div id="system-status">Loading system status...</div>
                </div>
            </div>
            
            <script>
                // Cargar estadísticas
                async function loadStats() {
                    try {
                        const response = await fetch('/api/stats');
                        const stats = await response.json();
                        
                        document.getElementById('online-performers').textContent = stats.livePerformers || 0;
                        document.getElementById('total-viewers').textContent = stats.totalViewers || 0;
                        document.getElementById('revenue-today').textContent = '$' + (stats.totalTipsToday || 0).toLocaleString();
                        document.getElementById('active-rooms').textContent = stats.totalPerformers || 0;
                    } catch (error) {
                        console.error('Error loading stats:', error);
                    }
                }
                
                // Cargar performers
                async function loadPerformers() {
                    try {
                        const response = await fetch('/api/performers-public');
                        const performers = await response.json();
                        
                        const performersContent = document.getElementById('performers-content');
                        performersContent.innerHTML = performers.map(performer => 
                            '<div class="performer-card">' +
                                '<div class="performer-info">' +
                                    '<strong>' + performer.name + '</strong>' +
                                    '<span class="status-badge ' + (performer.isLive ? 'status-live' : 'status-offline') + '">' +
                                        (performer.isLive ? '🔴 LIVE' : '⚫ OFFLINE') +
                                    '</span>' +
                                '</div>' +
                                '<div>' +
                                    '<strong>' + performer.currentViewers + '</strong> viewers | ' +
                                    '<strong>$' + performer.todayEarnings.toLocaleString() + '</strong> today' +
                                '</div>' +
                            '</div>'
                        ).join('');
                    } catch (error) {
                        document.getElementById('performers-content').innerHTML = 'Error loading performers';
                    }
                }
                
                // Cargar estado del sistema
                async function loadSystemStatus() {
                    try {
                        const response = await fetch('/health');
                        const health = await response.json();
                        
                        const systemStatus = document.getElementById('system-status');
                        systemStatus.innerHTML = 
                            '<div><strong>Server Status:</strong> ' + health.status + '</div>' +
                            '<div><strong>Uptime:</strong> ' + Math.floor(health.uptime / 60) + ' minutes</div>' +
                            '<div><strong>Environment:</strong> ' + health.environment + '</div>' +
                            '<div><strong>Version:</strong> ' + health.version + '</div>' +
                            '<div><strong>Webex Integration:</strong> ' + (health.webex.client_id === 'configured' ? '✅' : '❌') + '</div>' +
                            '<div><strong>Bold.co Integration:</strong> ' + (health.bold.api_key === 'configured' ? '✅' : '❌') + '</div>';
                    } catch (error) {
                        document.getElementById('system-status').innerHTML = 'Error loading system status';
                    }
                }
                
                // Cargar datos al inicio
                loadStats();
                loadPerformers();
                loadSystemStatus();
                
                // Actualizar cada 30 segundos
                setInterval(() => {
                    loadStats();
                    loadPerformers();
                    loadSystemStatus();
                }, 30000);
            </script>
        </body>
        </html>
    `);
});

// AGREGAR ESTAS NUEVAS RUTAS DESPUÉS DE LA RUTA /admin:

// API para estadísticas del admin
app.get('/admin/api/stats', requireAdminAuth, (req, res) => {
    try {
        const livePerformers = performers.filter(p => p.isLive).length;
        const totalViewers = performers.reduce((total, p) => total + p.currentViewers, 0);
        const totalTipsToday = performers.reduce((total, p) => total + p.todayEarnings, 0);
        
        res.json({
            onlinePerformers: livePerformers,
            totalViewers: totalViewers,
            revenueToday: totalTipsToday,
            activeRooms: performers.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Error loading admin stats' });
    }
});

// Gestión de performers
app.get('/admin/performers', requireAdminAuth, (req, res) => {
    res.json({
        message: 'Performers management endpoint',
        performers: performers.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            status: p.isLive ? 'online' : 'offline',
            viewers: p.currentViewers,
            earnings_today: p.todayEarnings,
            subscribers: p.subscribers,
            verified: p.isVerified,
            lastConnection: p.lastConnection
        }))
    });
});

// Estado de webhooks
app.get('/admin/webhooks', requireAdminAuth, (req, res) => {
    res.json({
        message: 'Webhook status',
        webhooks: {
            bold: {
                url: `${process.env.BASE_URL}/webhook/bold`,
                status: 'active',
                secret_configured: !!process.env.BOLD_WEBHOOK_SECRET,
                last_received: new Date().toISOString()
            },
            webex: {
                url: `${process.env.BASE_URL}/webhook/webex`,
                status: 'active',
                token_configured: !!process.env.WEBEX_BOT_TOKEN
            },
            railway: {
                url: `${process.env.BASE_URL}/webhook/railway`,
                status: 'active',
                last_deployment: new Date().toISOString()
            }
        }
    });
});

// Configuración del sistema
app.get('/admin/settings', requireAdminAuth, (req, res) => {
    res.json({
        message: 'System settings',
        settings: {
            server: {
                environment: process.env.NODE_ENV,
                version: '2.1.0',
                uptime: process.uptime(),
                base_url: process.env.BASE_URL
            },
            integrations: {
                bold_configured: !!process.env.BOLD_API_KEY,
                bold_webhook_configured: !!process.env.BOLD_WEBHOOK_SECRET,
                webex_configured: !!process.env.WEBEX_BOT_TOKEN,
                webex_client_configured: !!process.env.WEBEX_CLIENT_ID,
                admin_configured: !!process.env.ADMIN_PASSWORD
            },
            performers: {
                total: performers.length,
                live: performers.filter(p => p.isLive).length,
                verified: performers.filter(p => p.isVerified).length
            }
        }
    });
});

// Payments overview
app.get('/admin/payments', requireAdminAuth, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const totalToday = performers.reduce((total, p) => total + p.todayEarnings, 0);
    
    res.json({
        message: 'Payments overview',
        summary: {
            total_today: totalToday,
            total_performers_earning: performers.filter(p => p.todayEarnings > 0).length,
            average_per_performer: totalToday / performers.length,
            currency: 'COP'
        },
        by_performer: performers.map(p => ({
            id: p.id,
            name: p.name,
            today_earnings: p.todayEarnings,
            subscribers: p.subscribers,
            payment_methods: p.paymentMethods
        }))
    });
});

// Analytics endpoint
app.get('/admin/analytics', requireAdminAuth, (req, res) => {
    const totalViewers = performers.reduce((total, p) => total + p.currentViewers, 0);
    const totalSubscribers = performers.reduce((total, p) => total + p.subscribers, 0);
    
    res.json({
        message: 'Analytics data',
        analytics: {
            viewers: {
                current_total: totalViewers,
                average_per_performer: totalViewers / performers.filter(p => p.isLive).length || 0
            },
            subscribers: {
                total: totalSubscribers,
                average_per_performer: totalSubscribers / performers.length
            },
            performance: {
                top_performer_by_viewers: performers.reduce((prev, current) => 
                    (prev.currentViewers > current.currentViewers) ? prev : current
                ),
                top_performer_by_earnings: performers.reduce((prev, current) => 
                    (prev.todayEarnings > current.todayEarnings) ? prev : current
                )
            }
        }
    });
});

// Endpoint para cambiar password
app.post('/admin/change-password', requireAdminAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (currentPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(400).json({
            error: 'Current password incorrect'
        });
    }
    
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
            error: 'New password must be at least 8 characters'
        });
    }
    
    res.json({
        message: 'Password change request received',
        note: 'Update ADMIN_PASSWORD environment variable in Railway to complete the change'
    });
});

// Health check
app.get('/health', (req, res) => {
    const livePerformers = performers.filter(p => p.isLive).length;
    const totalViewers = performers.reduce((total, p) => total + p.currentViewers, 0);
    const totalTipsToday = performers.reduce((total, p) => total + p.todayEarnings, 0);
    
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        environment: process.env.NODE_ENV || 'production',
        uptime: Math.floor(process.uptime()),
        webex: {
            embedded_app_id: process.env.EMBEDDED_APP_ID ? 'configured' : 'not_configured',
            client_id: process.env.WEBEX_CLIENT_ID ? 'configured' : 'not_configured',
            webhook_secret: process.env.WEBEX_WEBHOOK_SECRET ? 'configured' : 'not_configured'
        },
        bold: {
            api_key: process.env.BOLD_API_KEY ? 'configured' : 'not_configured',
            public_key: process.env.BOLD_PUBLIC_KEY ? 'configured' : 'not_configured'
        },
        stats: {
            totalPerformers: performers.length,
            livePerformers: livePerformers,
            totalViewers: totalViewers,
            totalTipsToday: totalTipsToday
        },
        urls: {
            base: process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app',
            embedded: `${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/embedded`,
            shared: `${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/shared`,
            webhook: `${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/webhook/webex`
        }
    });
});

// API: Obtener performers
app.get('/api/performers-public', (req, res) => {
    try {
        // Simular cambios en tiempo real
        performers.forEach(performer => {
            if (performer.isLive) {
                performer.currentViewers = Math.max(1, performer.currentViewers + Math.floor(Math.random() * 20) - 10);
            }
        });
        
        res.json(performers);
    } catch (error) {
        console.error('Error fetching performers:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// API: Estadísticas
app.get('/api/stats', (req, res) => {
    try {
        const livePerformers = performers.filter(p => p.isLive).length;
        const totalViewers = performers.reduce((total, p) => total + p.currentViewers, 0);
        const totalTipsToday = performers.reduce((total, p) => total + p.todayEarnings, 0);
        const avgRating = 4.7; // Simulado
        
        res.json({
            totalPerformers: performers.length,
            livePerformers: livePerformers,
            totalViewers: totalViewers,
            totalTipsToday: totalTipsToday,
            totalRevenue: totalTipsToday,
            activeUsers: Math.floor(totalViewers * 1.3),
            avgRating: avgRating
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// API: Enviar propina
app.post('/api/tips/send', async (req, res) => {
    try {
        const { performerId, amount, currency, message, userId, userName, userEmail } = req.body;
        
        console.log('💰 Processing tip:', { performerId, amount, userName });
        
        // Crear datos para Bold.co
        const paymentData = {
            amount: amount,
            currency: currency || 'COP',
            description: `Propina para ${performerId}`,
            customer_email: userEmail,
            reference: `tip_${Date.now()}`,
            redirect_url: `${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/payment-success`,
            webhook_url: `${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/webhook/bold`
        };
        
        // Simular respuesta de Bold (en producción harías la llamada real)
        if (process.env.BOLD_API_KEY) {
            // Aquí harías la llamada real a Bold.co
            const simulatedResponse = {
                id: `pay_${Date.now()}`,
                payment_url: `https://checkout.bold.co/payment/${Date.now()}`,
                status: 'pending'
            };
            
            res.json({
                success: true,
                paymentUrl: simulatedResponse.payment_url,
                transactionId: simulatedResponse.id
            });
        } else {
            // Modo demo
            res.json({
                success: true,
                paymentUrl: `https://checkout.bold.co/demo/${Date.now()}`,
                transactionId: `demo_${Date.now()}`
            });
        }
        
    } catch (error) {
        console.error('Error processing tip:', error);
        res.status(500).json({ error: 'Error procesando propina' });
    }
});

// API: Toggle performer live
app.post('/api/performers/:id/start-live', (req, res) => {
    try {
        const performerId = req.params.id;
        const performer = performers.find(p => p.id === performerId);
        
        if (performer) {
            performer.isLive = true;
            performer.currentViewers = Math.floor(Math.random() * 100) + 50;
            console.log(`✅ ${performer.name} is now live`);
            res.json({ success: true, performer });
        } else {
            res.status(404).json({ error: 'Performer not found' });
        }
    } catch (error) {
        console.error('Error starting live:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/performers/:id/end-live', (req, res) => {
    try {
        const performerId = req.params.id;
        const performer = performers.find(p => p.id === performerId);
        
        if (performer) {
            performer.isLive = false;
            performer.currentViewers = 0;
            console.log(`⏹️ ${performer.name} stopped live`);
            res.json({ success: true, performer });
        } else {
            res.status(404).json({ error: 'Performer not found' });
        }
    } catch (error) {
        console.error('Error ending live:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Webhook de Webex
app.post('/webhook/webex', (req, res) => {
    try {
        const webhookData = req.body;
        console.log('📡 Webex webhook received:', webhookData);
        
        // Procesar webhook según el tipo
        if (webhookData.resource === 'messages') {
            console.log('New message in space:', webhookData.data.id);
        } else if (webhookData.resource === 'memberships') {
            console.log('Membership change:', webhookData.data.id);
        }
        
        res.status(200).json({ status: 'received' });
    } catch (error) {
        console.error('Error processing Webex webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

const crypto = require('crypto');

// =============================================================================
// WEBHOOK RAILWAY - Para notificaciones de deployment
// =============================================================================

app.use('/webhook/railway', express.json());

app.post('/webhook/railway', (req, res) => {
    try {
        console.log('🚂 Railway webhook received');
        
        const { type, project, deployment, environment, status, timestamp } = req.body;
        
        console.log(`📦 Event: ${type}`);
        console.log(`🏗️ Project: ${project?.name}`);
        console.log(`🌍 Environment: ${environment?.name}`);
        console.log(`📊 Status: ${status}`);
        
        switch (type) {
            case 'DEPLOY':
                handleRailwayDeploy(req.body);
                break;
                
            case 'SERVICE_CRASH':
                handleRailwayCrash(req.body);
                break;
                
            case 'SERVICE_REMOVE':
                handleRailwayRemove(req.body);
                break;
                
            default:
                console.log(`ℹ️ Unhandled Railway event: ${type}`);
                break;
        }
        
        res.status(200).json({
            message: 'Railway webhook processed successfully',
            type: type,
            project: project?.name,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error processing Railway webhook:', error);
        res.status(500).json({
            error: 'Internal server error processing Railway webhook',
            timestamp: new Date().toISOString()
        });
    }
});

// Funciones para manejar eventos de Railway
function handleRailwayDeploy(data) {
    const { deployment, status, project, environment } = data;
    
    console.log(`🚀 Deployment ${status.toLowerCase()} for ${project.name}`);
    console.log(`🆔 Deployment ID: ${deployment.id}`);
    console.log(`🌍 Environment: ${environment.name}`);
    console.log(`👤 Creator: ${deployment.creator.name || 'Unknown'}`);
    
    // Aquí puedes agregar lógica como:
    // - Notificar a Slack/Discord sobre el deploy
    // - Actualizar base de datos con info de deployment
    // - Enviar notificaciones a admins
    
    if (status === 'SUCCESS') {
        console.log('✅ Deployment completed successfully!');
        // Notificar éxito
    } else if (status === 'FAILED') {
        console.log('❌ Deployment failed!');
        // Notificar fallo
    } else if (status === 'BUILDING') {
        console.log('🔨 Deployment is building...');
    }
}

function handleRailwayCrash(data) {
    console.log('💥 Service crashed!');
    console.log(`🏗️ Project: ${data.project?.name}`);
    console.log(`🌍 Environment: ${data.environment?.name}`);
    
    // Lógica para manejar crashes:
    // - Alertas inmediatas
    // - Reintentos automáticos
    // - Notificaciones de emergencia
}

function handleRailwayRemove(data) {
    console.log('🗑️ Service removed');
    console.log(`🏗️ Project: ${data.project?.name}`);
    
    // Lógica para limpieza cuando se remueve un servicio
}

// =============================================================================
// WEBHOOK BOLD.CO - Para procesamiento de pagos
// =============================================================================

// Middleware específico para Bold (necesita raw body para verificación de firma)
app.use('/webhook/bold', express.raw({type: 'application/json'}));

app.post('/webhook/bold', async (req, res) => {
    try {
        console.log('💳 Bold.co webhook received');
        
        // 1. Obtener headers específicos de Bold.co
        const signature = req.headers['x-bold-signature'];
        const timestamp = req.headers['x-bold-timestamp'];
        const webhookSecret = process.env.BOLD_WEBHOOK_SECRET;
        
        console.log('🔍 Bold headers:', {
            signature: signature ? 'Present' : 'Missing',
            timestamp: timestamp ? 'Present' : 'Missing',
            secretConfigured: !!webhookSecret
        });
        
        // 2. Verificar que es realmente un webhook de Bold.co
        if (!signature || !timestamp) {
            console.error('❌ Missing Bold.co webhook headers - this might not be from Bold.co');
            return res.status(400).json({ error: 'Missing required Bold.co headers' });
        }
        
        // 3. Validar firma de Bold.co
        if (webhookSecret && signature) {
            const payload = timestamp + '.' + req.body;
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(payload, 'utf8')
                .digest('hex');
            
            const signatureParts = signature.split(',');
            const timestampPart = signatureParts.find(part => part.startsWith('t='));
            const signaturePart = signatureParts.find(part => part.startsWith('v1='));
            
            if (!timestampPart || !signaturePart) {
                console.error('❌ Invalid Bold.co signature format');
                return res.status(400).json({ error: 'Invalid signature format' });
            }
            
            const receivedTimestamp = timestampPart.split('=')[1];
            const receivedSignature = signaturePart.split('=')[1];
            
            // Verificar timestamp (no más de 5 minutos)
            const currentTime = Math.floor(Date.now() / 1000);
            const webhookTime = parseInt(receivedTimestamp);
            
            if (Math.abs(currentTime - webhookTime) > 300) {
                console.error('❌ Bold.co webhook timestamp too old');
                return res.status(400).json({ error: 'Webhook timestamp too old' });
            }
            
            // Verificar firma
            if (expectedSignature !== receivedSignature) {
                console.error('❌ Invalid Bold.co webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            
            console.log('✅ Bold.co webhook signature validated');
        } else {
            console.warn('⚠️ Bold.co webhook secret not configured - skipping validation');
        }
        
        // 4. Parsear payload de Bold.co
        const webhookData = JSON.parse(req.body.toString());
        
        console.log('💰 Bold.co event:', {
            event: webhookData.event,
            transaction_id: webhookData.data?.id,
            status: webhookData.data?.status,
            amount: webhookData.data?.amount,
            currency: webhookData.data?.currency,
            reference: webhookData.data?.reference
        });
        
        // 5. Procesar eventos de Bold.co
        switch (webhookData.event) {
            case 'transaction.approved':
                await handleBoldTransactionApproved(webhookData.data);
                break;
                
            case 'transaction.failed':
                await handleBoldTransactionFailed(webhookData.data);
                break;
                
            case 'transaction.pending':
                await handleBoldTransactionPending(webhookData.data);
                break;
                
            case 'transaction.rejected':
                await handleBoldTransactionRejected(webhookData.data);
                break;
                
            case 'transaction.voided':
                await handleBoldTransactionVoided(webhookData.data);
                break;
                
            default:
                console.log(`ℹ️ Unhandled Bold.co event: ${webhookData.event}`);
                break;
        }
        
        // 6. Respuesta requerida por Bold.co
        res.status(200).json({
            message: 'Bold.co webhook processed successfully',
            event: webhookData.event,
            transaction_id: webhookData.data?.id,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error processing Bold.co webhook:', error);
        res.status(500).json({
            error: 'Internal server error processing Bold.co webhook',
            timestamp: new Date().toISOString()
        });
    }
});

// =============================================================================
// FUNCIONES PARA MANEJAR EVENTOS DE BOLD.CO
// =============================================================================

async function handleBoldTransactionApproved(transactionData) {
    console.log(`✅ Bold Transaction APPROVED: ${transactionData.id}`);
    console.log(`💰 Amount: ${transactionData.amount} ${transactionData.currency}`);
    console.log(`📝 Reference: ${transactionData.reference}`);
    
    try {
        // Procesar según tipo de pago
        if (transactionData.reference?.startsWith('tip_')) {
            await processTipPayment(transactionData);
        } else if (transactionData.reference?.startsWith('sub_')) {
            await processSubscriptionPayment(transactionData);
        } else if (transactionData.reference?.startsWith('tokens_')) {
            await processTokensPurchase(transactionData);
        }
        
        // Notificar via WebSocket
        broadcastPaymentUpdate({
            type: 'payment_success',
            transaction_id: transactionData.id,
            amount: transactionData.amount,
            currency: transactionData.currency,
            reference: transactionData.reference
        });
        
    } catch (error) {
        console.error('Error processing approved transaction:', error);
    }
}

async function handleBoldTransactionFailed(transactionData) {
    console.log(`❌ Bold Transaction FAILED: ${transactionData.id}`);
    console.log(`📝 Reference: ${transactionData.reference}`);
    console.log(`🔍 Reason: ${transactionData.status_reason || 'Unknown'}`);
    
    broadcastPaymentUpdate({
        type: 'payment_failed',
        transaction_id: transactionData.id,
        reference: transactionData.reference,
        reason: transactionData.status_reason
    });
}

async function handleBoldTransactionPending(transactionData) {
    console.log(`⏳ Bold Transaction PENDING: ${transactionData.id}`);
    
    broadcastPaymentUpdate({
        type: 'payment_pending',
        transaction_id: transactionData.id,
        reference: transactionData.reference
    });
}

async function handleBoldTransactionRejected(transactionData) {
    console.log(`🚫 Bold Transaction REJECTED: ${transactionData.id}`);
    
    broadcastPaymentUpdate({
        type: 'payment_rejected',
        transaction_id: transactionData.id,
        reference: transactionData.reference
    });
}

async function handleBoldTransactionVoided(transactionData) {
    console.log(`↩️ Bold Transaction VOIDED: ${transactionData.id}`);
    
    broadcastPaymentUpdate({
        type: 'payment_voided',
        transaction_id: transactionData.id,
        reference: transactionData.reference
    });
}

// =============================================================================
// FUNCIONES DE PROCESAMIENTO DE PAGOS
// =============================================================================

async function processTipPayment(transactionData) {
    console.log('🎁 Processing tip payment');
    
    const referenceParts = transactionData.reference.split('_');
    const performerId = referenceParts.slice(1, -1).join('_');
    
    console.log(`💝 Tip for performer: ${performerId}`);
    console.log(`💰 Amount: ${transactionData.amount} ${transactionData.currency}`);
    
    // Actualizar earnings del performer
    // Ejemplo de estructura de datos:
    // {
    //   performer_id: performerId,
    //   transaction_id: transactionData.id,
    //   amount: transactionData.amount,
    //   currency: transactionData.currency,
    //   type: 'tip',
    //   status: 'completed',
    //   created_at: new Date()
    // }
}

async function processSubscriptionPayment(transactionData) {
    console.log('📝 Processing subscription payment');
    
    const referenceParts = transactionData.reference.split('_');
    const userId = referenceParts[1];
    const planType = referenceParts[2]; // monthly, yearly, etc.
    
    console.log(`👤 Subscription for user: ${userId}`);
    console.log(`📅 Plan: ${planType}`);
    console.log(`💰 Amount: ${transactionData.amount} ${transactionData.currency}`);
    
    // Activar suscripción del usuario
    // Calcular fecha de expiración según el plan
}

async function processTokensPurchase(transactionData) {
    console.log('🪙 Processing tokens purchase');
    
    const referenceParts = transactionData.reference.split('_');
    const userId = referenceParts[1];
    const tokenAmount = referenceParts[2];
    
    console.log(`👤 Tokens for user: ${userId}`);
    console.log(`🪙 Tokens amount: ${tokenAmount}`);
    console.log(`💰 Paid: ${transactionData.amount} ${transactionData.currency}`);
    
    // Agregar tokens al balance del usuario
}

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

function broadcastPaymentUpdate(updateData) {
    if (global.wsClients && global.wsClients.size > 0) {
        const message = JSON.stringify({
            type: 'payment_update',
            data: updateData,
            timestamp: new Date().toISOString()
        });
        
        global.wsClients.forEach(client => {
            if (client.readyState === 1) {
                try {
                    client.send(message);
                } catch (error) {
                    console.error('Error sending WebSocket message:', error);
                }
            }
        });
        
        console.log(`📡 Broadcasted payment update to ${global.wsClients.size} clients`);
    }
}

// =============================================================================
// ENDPOINTS DE PRUEBA Y MONITOREO
// =============================================================================

// Test endpoint para Railway
app.get('/webhook/railway/test', (req, res) => {
    res.json({
        status: 'Railway webhook endpoint active',
        url: `${process.env.BASE_URL}/webhook/railway`,
        supported_events: [
            'DEPLOY',
            'SERVICE_CRASH',
            'SERVICE_REMOVE'
        ],
        timestamp: new Date().toISOString()
    });
});

// Test endpoint para Bold.co
app.get('/webhook/bold/test', (req, res) => {
    res.json({
        status: 'Bold.co webhook endpoint active',
        url: `${process.env.BASE_URL}/webhook/bold`,
        secret_configured: !!process.env.BOLD_WEBHOOK_SECRET,
        environment: process.env.BOLD_ENV || 'test',
        supported_events: [
            'transaction.approved',
            'transaction.failed',
            'transaction.pending',
            'transaction.rejected',
            'transaction.voided'
        ],
        timestamp: new Date().toISOString()
    });
});

// Endpoint para ver logs recientes
app.get('/webhook/logs', (req, res) => {
    res.json({
        endpoints: {
            railway: `${process.env.BASE_URL}/webhook/railway`,
            bold: `${process.env.BASE_URL}/webhook/bold`
        },
        configurations: {
            bold_secret_configured: !!process.env.BOLD_WEBHOOK_SECRET,
            base_url_configured: !!process.env.BASE_URL
        },
        timestamp: new Date().toISOString()
    });
});

// Endpoint de verificación CSP
app.get('/verify-csp', (req, res) => {
    res.json({
        status: 'CSP Configuration Check',
        timestamp: new Date().toISOString(),
        webex_compatible: true,
        recommendations: [
            "✅ X-Frame-Options: ALLOWALL",
            "✅ CSP includes binaries.webex.com",
            "✅ CSP includes *.webex.com in frame-ancestors",
            "✅ CSP allows unsafe-inline for Webex SDK"
        ]
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno',
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.path,
        available_routes: [
            '/',
            '/embedded',
            '/shared', 
            '/performer',
            '/admin',
            '/health',
            '/api/performers-public',
            '/api/stats'
        ]
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Process terminated');
    });
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 PNPtv Live Server Started Successfully!

📊 Server Information:
   ├─ Port: ${PORT}
   ├─ Environment: ${process.env.NODE_ENV || 'production'}
   ├─ Base URL: ${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}
   └─ Version: 2.1.0
   
🌐 Available URLs:
   ├─ Main App: ${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}
   ├─ Embedded App: ${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/embedded  
   ├─ Performer App: ${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/performer
   ├─ Admin Panel: ${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/admin
   └─ Health Check: ${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/health
   
🔗 Webex Integration:
   ├─ Embedded App ID: ${process.env.EMBEDDED_APP_ID ? '✅ Configured' : '❌ Not configured'}
   ├─ Client ID: ${process.env.WEBEX_CLIENT_ID ? '✅ Configured' : '❌ Not configured'}
   └─ Webhook URL: ${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/webhook/webex
   
💳 Payment Integration:
   ├─ Bold API: ${process.env.BOLD_API_KEY ? '✅ Configured' : '❌ Not configured'}
   └─ Bold Webhook: ${process.env.BASE_URL || 'https://pnptv-live-production.up.railway.app'}/webhook/bold
   
✅ Server ready for Webex Embedded Apps!
    `);
});

module.exports = app;