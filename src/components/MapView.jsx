import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, LayerGroup, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";

import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Backend URL configuration - FORCE BACKEND CONNECTION v4.0 - DEPLOY NOW
const getBackendURL = () => {
  // FIXED: Always use direct backend - no fallback logic - REBUILD v4.0
  const DIRECT_BACKEND = 'https://beneficiaryreassignment.onrender.com';
  console.log('🔧🔧🔧🔧 FORCED Backend URL v4.0:', DIRECT_BACKEND);
  console.log('🔧🔧🔧🔧 BUILD TIMESTAMP:', Date.now());
  console.log('🔧🔧🔧🔧 DEPLOY TRIGGER:', new Date().toISOString());
  return DIRECT_BACKEND;
};

const BACKEND_URL = getBackendURL();
console.log('🔧 Environment variables check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
console.log('- Window hostname:', window.location.hostname);
console.log('- Final Backend URL:', BACKEND_URL);
console.log('- Window origin:', window.location.origin);
console.log('⚡ BACKEND_URL VERIFICATION:', BACKEND_URL);

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Parse coordinate helper
function parseCoord(val) {
  if (val == null) return undefined;
  if (typeof val === "string") {
    val = val.trim();
    if (val === "" || val.toLowerCase() === "nan" || val.toLowerCase() === "null") return undefined;
  }
  const num = Number(val);
  return Number.isFinite(num) ? num : undefined;
}

// Test backend connectivity
const testBackendConnectivity = async () => {
  try {
    console.log('🔍 Testing backend connectivity...');
    const response = await axios.get(`${BACKEND_URL}/api/health`, { 
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ Backend health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', {
      message: error.message,
      status: error.response?.status,
      url: `${BACKEND_URL}/api/health`
    });
    return false;
  }
};

// Haversine distance calculation
function haversine([lon1, lat1], [lon2, lat2]) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// MapUpdater component to auto-fit bounds
const MapUpdater = ({ fpsData, customerData }) => {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const timeout = setTimeout(() => {
      if (!map) return;
      const points = [
        ...fpsData.map(({ latitude, longitude }) => [parseCoord(latitude), parseCoord(longitude)]),
        ...customerData.map(({ latitude, longitude }) => [parseCoord(latitude), parseCoord(longitude)]),
      ].filter(([lat, lon]) => lat != null && lon != null);

      if (points.length === 0) return;

      try {
        const group = L.featureGroup(points.map((p) => L.marker(p)));
        map.fitBounds(group.getBounds().pad(0.15));
        fitted.current = true;
      } catch (e) {
        console.warn("Map fitBounds error:", e);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [map, fpsData, customerData]);

  return null;
};

// FIXED: Sequential route processing component - routes ALL customers regardless of visibility
const ORSRoutes = ({ customerData, fpsData, visibleFPSIndices = [], shouldRoute = false, onRouteDistanceUpdate, onProcessingChange }) => {
  const [routes, setRoutes] = useState([]);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState([]);
  const [distances, setDistances] = useState({});
  const processingRef = useRef(false);

  // Process only customers whose FPS is visible
  const getAllCustomers = () => {
    return customerData.filter(cust => {
      const fpsIndex = fpsData.findIndex(fps => String(fps.fps_id) === String(cust.FPSCode));
      // Only include customers whose FPS is visible
      return fpsIndex !== -1 && visibleFPSIndices.includes(fpsIndex);
    });
  };

  useEffect(() => {
    if (!shouldRoute || processingRef.current) return;
    
    const allCustomers = getAllCustomers();
    
    if (!allCustomers.length || !fpsData.length) {
      setRoutes([]);
      setDistances({});
      if (visibleFPSIndices.length === 0) {
        setStatus("No FPS shops visible - select FPS shops to show routes");
      } else {
        setStatus("No customers assigned to visible FPS shops");
      }
      return;
    }

    processingRef.current = true;
    setErrors([]);
    setRoutes([]);
    setDistances({});
    setStatus("Initializing sequential routing...");
    
    if (onProcessingChange) {
      onProcessingChange(true);
    }
    
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const processRoutesSequentially = async () => {
      let cancelled = false;
      const totalCustomers = allCustomers.length;
      let consecutiveErrors = 0;
      let baseDelay = 1000; // Start with 1 second delay

      try {
        for (let i = 0; i < totalCustomers; i++) {
          if (cancelled) break;

          const cust = allCustomers[i];
          const lat = parseCoord(cust.latitude);
          const lon = parseCoord(cust.longitude);
          const fps = fpsData.find(f => String(f.fps_id) === String(cust.FPSCode));

          setStatus(`Processing ${i + 1}/${totalCustomers}: ${cust.Member_Name_EN || 'Unknown'}`);

          let newRoute;
          let computedDistance;

          if (!fps || lat == null || lon == null) {
            computedDistance = "N/A";
            newRoute = {
              key: `fallback-${i}`,
              routeCoordinates: lat && lon ? [[lat, lon]] : [[0, 0]],
              customerName: cust.Member_Name_EN || cust.customerName,
              fpsName: fps ? fps.fps_name : "N/A",
              routeDistance: computedDistance,
              isFallback: true,
              error: "Invalid data"
            };
          } else {
            const fpsLat = parseCoord(fps.latitude);
            const fpsLon = parseCoord(fps.longitude);

            const isSameLocation = Math.abs(lat - fpsLat) < 0.0001 && Math.abs(lon - fpsLon) < 0.0001;
            
            if (isSameLocation) {
              computedDistance = "0.00 km";
              newRoute = {
                key: `same-location-${i}`,
                routeCoordinates: [[lat, lon]],
                customerName: cust.Member_Name_EN || cust.customerName,
                fpsName: fps.fps_name,
                routeDistance: computedDistance,
                isFallback: false
              };
            } else {
              // Retry function with exponential backoff
              const retryRequest = async (requestBody, maxRetries = 3) => {
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                  try {
                    console.log(`🔄 Attempt ${attempt}/${maxRetries}: Calling ${BACKEND_URL}/api/ors`);
                    console.log('📍 Request coordinates:', requestBody.coordinates);
                    
                    const response = await axios.post(`${BACKEND_URL}/api/ors`, requestBody, {
                      timeout: 60000, // Increased timeout
                      headers: { 
                        "Content-Type": "application/json"
                        // Removed Origin header - browsers set this automatically and don't allow manual override
                      }
                    });

                    console.log('✅ Backend response received:', response.status);
                    
                    const feature = response.data?.features?.[0];
                    if (feature && feature.geometry && feature.geometry.coordinates) {
                      console.log('✅ Valid route data received');
                      return { success: true, data: response.data };
                    } else {
                      console.log('❌ Invalid route response structure');
                      throw new Error("Invalid route response structure");
                    }
                  } catch (error) {
                    console.error(`❌ Attempt ${attempt} failed:`, {
                      message: error.message,
                      status: error.response?.status,
                      data: error.response?.data,
                      url: `${BACKEND_URL}/api/ors`
                    });
                    
                    // Don't retry on certain errors
                    if (error.response?.status === 400 || error.response?.status === 401) {
                      console.error('🚫 Non-retryable error, stopping attempts');
                      throw error;
                    }
                    
                    if (attempt === maxRetries) {
                      console.error('🚫 Max retries reached, giving up');
                      throw error;
                    }
                    
                    // Exponential backoff: wait longer between retries
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
                    console.log(`Route request failed (attempt ${attempt}), retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                }
              };

              try {
                // Simplified routing request to avoid validation errors
                const requestBody = {
                  coordinates: [[lon, lat], [fpsLon, fpsLat]],
                  profile: "driving-car",
                  format: "geojson",
                  geometry_simplify: false,
                  instructions: false,
                  radiuses: [1500, 1500] // 1500m search radius around each point
                };

                console.log('🗺️ Simplified routing request:', requestBody);
                const result = await retryRequest(requestBody, 5); // Increased retries to 5
                const feature = result.data?.features?.[0];
                const roadDistance = feature.properties?.summary?.distance;
                
                if (roadDistance && roadDistance > 0) {
                  computedDistance = `${(roadDistance / 1000).toFixed(2)} km`;
                  console.log('✅ Got road route:', computedDistance);
                } else {
                  console.warn('⚠️ No road distance found, using straight line');
                  const straightDist = haversine([lon, lat], [fpsLon, fpsLat]);
                  computedDistance = `${(straightDist / 1000).toFixed(2)} km (straight)`;
                }
                
                // Validate route coordinates
                const routeCoords = feature.geometry.coordinates;
                if (routeCoords && routeCoords.length > 2) {
                  console.log('✅ Valid route with', routeCoords.length, 'points');
                  newRoute = {
                    key: `route-${i}`,
                    routeCoordinates: routeCoords.map(([lng, lat]) => [lat, lng]),
                    customerName: cust.Member_Name_EN || cust.customerName,
                    fpsName: fps.fps_name,
                    routeDistance: computedDistance,
                    isFallback: false
                  };
                } else {
                  console.warn('⚠️ Route has too few points, treating as fallback');
                  throw new Error('Route geometry insufficient');
                }
              } catch (error) {
                console.warn(`🔴 Route calculation failed for ${cust.Member_Name_EN}:`, error.message);
                
                // Only use fallback for genuine failures
                if (error.response?.status === 429) {
                  // Rate limited - wait longer and retry once more
                  console.log('⏳ Rate limited, waiting 5 seconds for retry...');
                  await new Promise(resolve => setTimeout(resolve, 5000));
                  
                  try {
                    // Simplified retry request
                    const simpleRequest = {
                      coordinates: [[lon, lat], [fpsLon, fpsLat]],
                      profile: "driving-car",
                      format: "geojson"
                    };
                    const retryResult = await retryRequest(simpleRequest, 1);
                    const retryFeature = retryResult.data?.features?.[0];
                    
                    if (retryFeature && retryFeature.geometry.coordinates.length > 2) {
                      const roadDistance = retryFeature.properties?.summary?.distance;
                      computedDistance = roadDistance ? `${(roadDistance / 1000).toFixed(2)} km` : 
                                        `${(haversine([lon, lat], [fpsLon, fpsLat]) / 1000).toFixed(2)} km (approx)`;
                      
                      newRoute = {
                        key: `route-retry-${i}`,
                        routeCoordinates: retryFeature.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
                        customerName: cust.Member_Name_EN || cust.customerName,
                        fpsName: fps.fps_name,
                        routeDistance: computedDistance,
                        isFallback: false
                      };
                    } else {
                      throw new Error('Retry failed');
                    }
                  } catch (retryError) {
                    // Final fallback
                    const straightDistance = haversine([lon, lat], [fpsLon, fpsLat]) / 1000;
                    computedDistance = `${straightDistance.toFixed(2)} km (straight)`;
                    
                    newRoute = {
                      key: `fallback-${i}`,
                      routeCoordinates: [[lat, lon], [fpsLat, fpsLon]],
                      customerName: cust.Member_Name_EN || cust.customerName,
                      fpsName: fps.fps_name,
                      routeDistance: computedDistance,
                      isFallback: true,
                      error: "Rate limited - no route available"
                    };
                  }
                } else {
                  // Other errors - create fallback
                  const straightDistance = haversine([lon, lat], [fpsLon, fpsLat]) / 1000;
                  computedDistance = `${straightDistance.toFixed(2)} km (straight)`;
                  
                  newRoute = {
                    key: `fallback-${i}`,
                    routeCoordinates: [[lat, lon], [fpsLat, fpsLon]],
                    customerName: cust.Member_Name_EN || cust.customerName,
                    fpsName: fps.fps_name,
                    routeDistance: computedDistance,
                    isFallback: true,
                    error: error.response?.status === 404 ? "No route found (remote area)" : 
                           error.response?.status === 503 ? "Service temporarily unavailable" :
                           error.code === 'ECONNABORTED' ? "Request timeout" :
                           "Routing service error"
                  };
                }

                setErrors(prev => [...prev, `${cust.Member_Name_EN}: ${error.message}`]);
              }
            }
          }

          const customerName = cust.Member_Name_EN || cust.customerName;
          
          setRoutes(prevRoutes => [...prevRoutes, newRoute]);
          
          setDistances(prevDistances => {
            const updatedDistances = { ...prevDistances, [customerName]: computedDistance };
            
            setTimeout(() => {
              if (onRouteDistanceUpdate) {
                onRouteDistanceUpdate(updatedDistances);
              }
            }, 0);
            
            return updatedDistances;
          });

          // Adaptive delay based on success/error rate
          if (newRoute.isFallback) {
            consecutiveErrors++;
            // Increase delay after errors to avoid overwhelming the API
            baseDelay = Math.min(baseDelay * 1.5, 8000);
          } else {
            consecutiveErrors = 0;
            // Reduce delay after successful requests
            baseDelay = Math.max(baseDelay * 0.9, 1000);
          }

          // Add extra delay if there are too many consecutive errors
          const adaptiveDelay = consecutiveErrors > 3 ? baseDelay * 2 : baseDelay;
          
          if (i < totalCustomers - 1) { // Don't sleep after the last item
            await sleep(adaptiveDelay);
          }
        }

        if (!cancelled) {
          setStatus(`✅ All ${totalCustomers} routes completed with synchronized distances`);
        }

      } catch (err) {
        console.error("Sequential routing error:", err);
        setStatus(`❌ Routing failed: ${err.message}`);
      } finally {
        processingRef.current = false;
        if (onProcessingChange) {
          onProcessingChange(false);
        }
      }

      return () => { cancelled = true; };
    };

    processRoutesSequentially();
  }, [shouldRoute, customerData, fpsData]); // Removed visibleFPSIndices from dependencies

  return (
    <>
      <div style={{ marginBottom: 4, color: status.includes("✅") ? "green" : status.includes("❌") ? "red" : "orange", fontSize: "12px", fontWeight: "bold" }}>
        {status}
      </div>
      {errors.length > 0 && (
        <div style={{ marginBottom: 4, color: "red", fontSize: "10px" }}>
          Recent errors: {errors.slice(-3).join(", ")}
        </div>
      )}
      <LayerGroup>
        {routes
          .filter(route => {
            // If no FPS are visible, don't show any routes
            if (visibleFPSIndices.length === 0) {
              return false;
            }
            
            // Only show routes for customers whose FPS is currently VISIBLE
            const customerFPS = fpsData.find(fps => fps.fps_name === route.fpsName);
            if (!customerFPS) return false;
            const fpsIndex = fpsData.findIndex(fps => fps.fps_name === route.fpsName);
            return fpsIndex !== -1 && visibleFPSIndices.includes(fpsIndex);
          })
          .map(({ key, routeCoordinates, customerName, fpsName, routeDistance, isFallback, error }) =>
            routeCoordinates && routeCoordinates.length > 1 ? (
              <Polyline
                key={key}
                positions={routeCoordinates}
                pathOptions={{
                  color: isFallback ? "blue" : "orange",
                  weight: isFallback ? 3 : 4,
                  opacity: 0.8,
                  dashArray: isFallback ? "8 8" : null
                }}
              >
                <Popup>
                  <strong>{customerName} to {fpsName}</strong><br />
                  <strong>Distance:</strong> {routeDistance}<br />
                  {isFallback && (
                    <div style={{ color: "blue", fontSize: "11px" }}>
                      Fallback route: {error}
                    </div>
                  )}
                </Popup>
              </Polyline>
            ) : null
          )}
      </LayerGroup>
    </>
  );
};

// FIXED: MapView component with corrected statistics calculation
const MapView = ({ fpsData, customerData, redirectionResults, visibleFPSIndices = [], onRouteDistanceUpdate }) => {
  const [shouldRoute, setShouldRoute] = useState(false);
  const [routeDistances, setRouteDistances] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  const STATIC_MAP_KEY = "stable-map";

  useEffect(() => {
    setShouldRoute(false);
    setIsProcessing(false);
    
    // Test backend connectivity on component mount
    testBackendConnectivity();
  }, [redirectionResults]);

  // Reset routing when visibility changes
  useEffect(() => {
    setShouldRoute(false);
    setIsProcessing(false);
    setRouteDistances({});
  }, [visibleFPSIndices]);

  const handleProcessingChange = (processing) => {
    setIsProcessing(processing);
  };

  const handleRouteDistanceUpdate = (distances) => {
    setRouteDistances(distances);
    if (onRouteDistanceUpdate) {
      onRouteDistanceUpdate(distances);
    }
  };

  const validFPS = (fpsData || []).filter(fps => {
    const lat = parseCoord(fps.latitude);
    const lon = parseCoord(fps.longitude);
    return lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  });

  const validCustomers = (customerData || []).filter(cust => {
    const lat = parseCoord(cust.latitude);
    const lon = parseCoord(cust.longitude);
    // Simply validate coordinates - don't filter by FPS status here
    // Customer reassignment is handled by the parent component
    return (
      lat != null &&
      lon != null &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  });

  // Filter FPS and customers based on visibility FOR DISPLAY ONLY
  const visibleFPS = validFPS.filter((_, index) => 
    visibleFPSIndices.includes(index)
  );

  const visibleCustomers = validCustomers.filter(cust => {
    // If no FPS are visible, don't show any customers
    if (visibleFPSIndices.length === 0) {
      return false;
    }
    
    // Find the FPS this customer is actually assigned to
    const assignedFPS = validFPS.find(fps => String(fps.fps_id) === String(cust.FPSCode));
    
    if (!assignedFPS) {
      return false; // Customer has invalid FPS assignment
    }
    
    const fpsIndex = validFPS.findIndex(fps => String(fps.fps_id) === String(cust.FPSCode));
    
    // Show customer ONLY if their assigned FPS is in the visible list
    return fpsIndex !== -1 && visibleFPSIndices.includes(fpsIndex);
  });

  // FIXED: Calculate statistics based on ALL FPS, not just visible ones
  const totalOpenFPS = validFPS.filter(f => f.status !== "closed").length;
  const totalClosedFPS = validFPS.filter(f => f.status === "closed").length;
  const visibleOpenFPS = visibleFPS.filter(f => f.status !== "closed").length;
  const visibleClosedFPS = visibleFPS.filter(f => f.status === "closed").length;

  const handleStartRouting = () => {
    if (!isProcessing) {
      setShouldRoute(true);
      setIsProcessing(true);
    }
  };

  return (
    <div>
      <div style={{ 
        marginBottom: 8, 
        padding: 8, 
        backgroundColor: "#f8f9fa", 
        borderRadius: 4,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <small>
          <strong>Total FPS:</strong> {validFPS.length} | 
          <strong>Visible:</strong> {visibleFPS.length} | 
          Open: {totalOpenFPS} | 
          Closed: {totalClosedFPS} | 
          <strong>Total Beneficiaries:</strong> {validCustomers.length} | 
          <strong>Visible:</strong> {visibleCustomers.length}
        </small>
        <button 
          onClick={handleStartRouting}
          style={{ 
            padding: "6px 12px", 
            backgroundColor: isProcessing ? "#6c757d" : "#007bff", 
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isProcessing ? "not-allowed" : "pointer",
            fontSize: "12px"
          }}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Start Routing"}
        </button>
      </div>
      
      <div style={{ height: 520, width: "100%" }}>
        {visibleFPSIndices.length === 0 && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            textAlign: "center",
            border: "2px solid #007bff"
          }}>
            <h5 style={{ color: "#007bff", marginBottom: "10px" }}>No FPS Shops Selected</h5>
            <p style={{ margin: 0, color: "#666" }}>
              Please select FPS shops from the table to view them on the map.<br/>
              Use the "Show on Map" column to toggle visibility.
            </p>
          </div>
        )}
        <MapContainer 
          key={STATIC_MAP_KEY}
          center={[15.5, 74.1]} 
          zoom={12} 
          scrollWheelZoom 
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          <MapUpdater fpsData={visibleFPS} customerData={visibleCustomers} />

          {/* Enhanced FPS Markers - Only show visible ones */}
          {visibleFPS.map((fps, i) => {
            const beneficiaryCount = visibleCustomers.filter(
              cust => String(cust.FPSCode) === String(fps.fps_id)
            ).length;
            const isOpen = fps.status !== "closed";
            const color = isOpen ? "green" : "red";
            return (
              <CircleMarker
                key={`fps-${fps.fps_id}-${i}`}
                center={[parseCoord(fps.latitude), parseCoord(fps.longitude)]}
                pathOptions={{ 
                  color, 
                  fillColor: color, 
                  fillOpacity: 0.7,
                  weight: 2 
                }}
                radius={isOpen ? 12 : 10}
              >
                <Popup>
                  <strong>Name:</strong> {fps.fps_name}<br />
                  <strong>Status:</strong> <span style={{ color }}>{isOpen ? "Open" : "Closed"}</span><br />
                  <strong>FPS ID:</strong> {fps.fps_id}<br />
                  <strong>Visible Beneficiary Count:</strong> {beneficiaryCount}
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Enhanced Beneficiary Markers - Only show visible ones */}
          {visibleCustomers.map((cust, i) => {
            const lat = parseCoord(cust.latitude);
            const lon = parseCoord(cust.longitude);
            const key = cust.MemberId || cust.RationNo || i;
            const customerName = cust.Member_Name_EN || cust.customerName;
            const distance = routeDistances[customerName] || "Distance not calculated";
            
            // Find assigned FPS details
            const assignedFPS = validFPS.find(fps => String(fps.fps_id) === String(cust.FPSCode));
            const fpsName = assignedFPS?.fps_name || cust.assigned_fps || "Unknown";
            const fpsStatus = assignedFPS?.status || "unknown";
            
            // Determine marker color based on FPS status
            const markerColor = fpsStatus === "closed" ? "red" : "blue";
            const fillColor = fpsStatus === "closed" ? "pink" : "lightblue";
            
            return (
              <CircleMarker
                key={`cust-${key}`}
                center={[lat, lon]}
                pathOptions={{ 
                  color: markerColor, 
                  fillColor: fillColor, 
                  fillOpacity: 0.6,
                  weight: 2 
                }}
                radius={8}
              >
                <Popup>
                  <strong>Name:</strong> {customerName}<br />
                  <strong>Assigned FPS:</strong> {fpsName}<br />
                  <strong>FPS Code:</strong> {cust.FPSCode || "N/A"}<br />
                  <strong>FPS Status:</strong> <span style={{ 
                    color: fpsStatus === "closed" ? "red" : "green",
                    fontWeight: "bold"
                  }}>
                    {fpsStatus.toUpperCase()}
                  </span><br />
                  <strong>Distance:</strong> <span style={{ color: "black" }}>
                    {distance}
                  </span>
                  {fpsStatus === "closed" && (
                    <div style={{ fontSize: "10px", color: "red", marginTop: "4px", fontStyle: "italic" }}>
                      ⚠️ Assigned FPS is closed - customer needs reassignment
                    </div>
                  )}
                  {distance === "Distance not calculated" && (
                    <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
                      Click "Start Routing" to calculate
                    </div>
                  )}
                </Popup>
              </CircleMarker>
            );
          })}

          <ORSRoutes 
            customerData={validCustomers} // Pass ALL customers, not just visible ones
            fpsData={validFPS} // Pass ALL FPS, not just visible ones
            visibleFPSIndices={visibleFPSIndices}
            shouldRoute={shouldRoute}
            onRouteDistanceUpdate={handleRouteDistanceUpdate}
            onProcessingChange={handleProcessingChange}
          />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;