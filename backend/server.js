require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./src/routes/api');
const dbInit = require('./dbInit');
const envs = require('./src/config/envs');
const { globalLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Run DB check & migrations on startup
dbInit();

const PORT = process.env.PORT || envs.port;
// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: envs.nodeEnv === 'production'
    ? envs.frontendUrl
    : [envs.frontendUrl, 'http://localhost:3006', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));

// Health check routes for UptimeRobot (bypasses global rate limiter for clean, lightweight pings)
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));
app.get('/api/v1/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Global rate limiting
app.use(globalLimiter);

// Body parser middleware with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Mount API routes
app.use('/api/v1', apiRoutes);

// Broadcast utility to send real-time events to all connected clients
function broadcast(data) {
  const messageStr = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      // Scope connection broadcasts to the correct restaurant
      // Match by either UUID (restaurantId) or slug (restaurantSlug)
      if (data.restaurantId || data.restaurantSlug) {
        const clientId = client.restaurantId; // Could be UUID or slug depending on who registered
        const matchesId = data.restaurantId && clientId === data.restaurantId;
        const matchesSlug = data.restaurantSlug && clientId === data.restaurantSlug;
        if (!matchesId && !matchesSlug) {
          return;
        }
      }
      client.send(messageStr);
    }
  });
}

// Make the broadcast function accessible in controllers
app.set('wssBroadcast', broadcast);

// WebSocket event orchestration
wss.on('connection', (ws) => {
  console.log('New client connected to backend real-time sync.');

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(message);
      console.log('Received socket event:', payload.type);

      if (payload.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }

      if (payload.type === 'REGISTER') {
        ws.restaurantId = payload.restaurantId;
        ws.role = payload.role || 'customer';
        console.log(`Registered WebSocket client: restaurantId=${ws.restaurantId}, role=${ws.role}`);
      }
    } catch (err) {
      console.error('Error parsing client socket message:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from backend real-time sync.');
  });
});

// Start API & WebSocket server
server.listen(PORT, () => {
  console.log(`===========================================================`);
  console.log(`  Smart QR Code Ordering Backend is live! [${envs.nodeEnv}]`);
  console.log(`  - API Base URL       : http://localhost:${PORT}/api/v1`);
  console.log(`  - WebSocket Server   : ws://localhost:${PORT}`);
  console.log(`  - Frontend Origin    : ${envs.frontendUrl}`);
  console.log(`===========================================================`);
});
