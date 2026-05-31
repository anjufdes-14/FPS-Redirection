const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Simple CORS configuration - Allow all origins for debugging
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const ORS_API_KEY = process.env.ORS_API_KEY;
if (!ORS_API_KEY || ORS_API_KEY === 'demo_key') {
  console.warn('WARNING: Using demo API key. Please set ORS_API_KEY in .env file');
}

// Rate limiter: 60 requests per minute (more generous)
const orsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // Increased from 40 to 60
  keyGenerator: () => 1,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Don't count failed requests against the limit
  handler: function (req, res) {
    res.set('Retry-After', Math.ceil(60000 / 60)); // Dynamic retry-after
    res.status(429).json({
      error: "Rate limit exceeded: Only 60 requests per minute allowed. Please slow down.",
      retryAfter: Math.ceil(60000 / 60)
    });
  }
});

// Health check endpoint - Updated for deployment
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    apiKey: ORS_API_KEY ? 'Set' : 'Not Set',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Debug endpoint to check API connectivity
app.get('/api/debug', async (req, res) => {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      apiKeySet: !!ORS_API_KEY,
      apiKeyPrefix: ORS_API_KEY ? ORS_API_KEY.substring(0, 10) + '...' : 'Not set',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
    
    // Test ORS API
    try {
      const testResponse = await axios.get('https://api.openrouteservice.org/health', {
        timeout: 5000
      });
      debug.orsHealth = testResponse.status === 200 ? 'OK' : 'Error';
    } catch (error) {
      debug.orsHealth = `Error: ${error.message}`;
    }
    
    res.json(debug);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ORS connectivity test endpoint
app.get('/api/test-ors', async (req, res) => {
  try {
    const testCoordinates = [[73.8921, 15.3520], [73.8908, 15.3539]]; // Sample coordinates
    const startTime = Date.now();
    
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      { coordinates: testCoordinates },
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 45000 // Increased to 45 seconds for health check
      }
    );
    
    const duration = Date.now() - startTime;
    res.json({
      status: 'ORS API accessible',
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      testCoordinates
    });
  } catch (error) {
    res.status(500).json({
      status: 'ORS API error',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// Simple test endpoint without any middleware
app.get("/api/cors-test", (req, res) => {
  res.json({ 
    message: "CORS test successful", 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'No origin',
    userAgent: req.headers['user-agent'] || 'No user agent'
  });
});

// Test endpoint for debugging
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "API is working", 
    timestamp: new Date().toISOString(),
    endpoints: ['/api/health', '/api/debug', '/api/ors', '/api/ors-matrix', '/api/test-ors'],
    corsOrigins: ['https://redirectionbot.vercel.app'],
    apiKeyStatus: ORS_API_KEY ? 'Configured' : 'Missing'
  });
});

// GET endpoint to test ORS functionality (for browser testing)
app.get('/api/ors-test', async (req, res) => {
  try {
    const testCoordinates = [[73.8567, 15.2993], [73.8370, 15.3173]];
    
    if (!ORS_API_KEY) {
      return res.status(500).json({ error: 'ORS API key not configured' });
    }
    
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      { coordinates: testCoordinates },
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    res.json({ 
      success: true, 
      message: "ORS API working",
      routeFound: !!response.data?.features?.[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple ORS test endpoint without middleware
app.post('/api/ors-simple', async (req, res) => {
  res.json({ 
    message: "ORS simple endpoint working",
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// ORS directions endpoint (single route)
app.post('/api/ors', orsLimiter, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  const origin = req.get('Origin') || 'No Origin';
  
  try {
    console.log(`[${new Date().toISOString()}] ORS Request from ${clientIP} (Origin: ${origin})`);
    console.log(`[${new Date().toISOString()}] Request body:`, JSON.stringify(req.body));
    
    if (!req.body || !req.body.coordinates || !Array.isArray(req.body.coordinates)) {
      console.log('❌ Invalid request format');
      return res.status(400).json({ 
        error: "Invalid request format. Expected: { coordinates: [[lng, lat], [lng, lat]] }" 
      });
    }
    if (req.body.coordinates.length < 2) {
      console.log('❌ Not enough coordinates');
      return res.status(400).json({ 
        error: "At least 2 coordinate pairs required" 
      });
    }
    if (!ORS_API_KEY) {
      console.log('❌ No API key configured');
      return res.status(500).json({ 
        error: "ORS API key not configured" 
      });
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Making ORS API call with ${req.body.coordinates.length} coordinates...`);
    
    // Prepare simplified but effective request body
    const orsRequestBody = {
      coordinates: req.body.coordinates,
      format: req.body.format || "geojson",
      profile: req.body.profile || "driving-car",
      geometry_simplify: req.body.geometry_simplify !== undefined ? req.body.geometry_simplify : false,
      instructions: req.body.instructions !== undefined ? req.body.instructions : false
    };
    
    // Only add radiuses if provided (this is the key for 1500m search)
    if (req.body.radiuses && Array.isArray(req.body.radiuses)) {
      orsRequestBody.radiuses = req.body.radiuses;
    }
    
    // Remove any undefined values to avoid API issues
    Object.keys(orsRequestBody).forEach(key => {
      if (orsRequestBody[key] === undefined) {
        delete orsRequestBody[key];
      }
    });
    
    console.log(`[${new Date().toISOString()}] Simplified ORS request:`, JSON.stringify(orsRequestBody, null, 2));
    
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      orsRequestBody,
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 90000, // Reduced to 90 seconds
      }
    );
    
    if (!response.data || !response.data.features || !response.data.features[0]) {
      console.error('❌ Invalid ORS response structure:', response.data);
      return res.status(500).json({ 
        error: "Invalid response from routing service" 
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Successfully proxied request to ORS (${duration}ms)`);
    res.json(response.data);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] ORS API Error (${duration}ms):`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      timeout: error.code === 'ECONNABORTED' && error.message.includes('timeout')
    });
    
    const status = error.response?.status || 500;
    const errorMsg = error.response?.data || { 
      error: error.code === 'ECONNABORTED' ? 'Request timeout - please try again' : 'Routing service unavailable' 
    };
    res.status(status).json(errorMsg);
  }
});

// 🟢 ----------- ADDED: ORS MATRIX ENDPOINT --------------------
app.post('/api/ors-matrix', orsLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log(`[${new Date().toISOString()}] Matrix request received:`, {
      locationsCount: req.body.locations?.length,
      sources: req.body.sources,
      destinations: req.body.destinations
    });
    
    const { locations, sources, destinations } = req.body;
    if (!Array.isArray(locations) || locations.length < 2) {
      return res.status(400).json({ 
        error: "Invalid request format. 'locations' array required" 
      });
    }
    
    const matrixBody = {
      locations,
      profile: "driving-car",
      metrics: ["distance"], // Add "duration" if needed
      units: "km",
      sources: Array.isArray(sources) ? sources : [0],
      destinations: Array.isArray(destinations) ? destinations : locations.map((_, i) => i)
    };

    console.log(`[${new Date().toISOString()}] Making ORS Matrix API call...`);
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/matrix/driving-car',
      matrixBody,
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 60000, // Increased to 60 seconds
      }
    );
    
    if (!response.data || !response.data.distances) {
      return res.status(500).json({ 
        error: "Invalid response from ORS matrix service" 
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Matrix request completed successfully (${duration}ms)`);
    res.json(response.data);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] ORS Matrix API Error (${duration}ms):`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      timeout: error.code === 'ECONNABORTED' && error.message.includes('timeout')
    });
    
    const status = error.response?.status || 500;
    const errorMsg = error.response?.data || { 
      error: error.code === 'ECONNABORTED' ? 'Matrix request timeout - please try again' : 'Matrix service unavailable' 
    };
    res.status(status).json(errorMsg);
  }
});
// 🟢 -----------------------------------------------------------

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(port, () => {
  console.log(`🚀 ORS proxy server running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/api/test`);
  console.log(`🔑 API Key status: ${ORS_API_KEY ? 'Configured ✅' : 'NOT CONFIGURED ❌'}`);
  console.log('📋 Available endpoints:');
  console.log('  GET  / - Server status');
  console.log('  GET  /api/health - Health check');
  console.log('  GET  /api/debug - Debug info');
  console.log('  GET  /api/test - API test');
  console.log('  GET  /api/test-ors - ORS connectivity test');
  console.log('  POST /api/ors - ORS directions');
  console.log('  POST /api/ors-matrix - ORS distance matrix');
});
