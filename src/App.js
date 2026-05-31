import React, { useState, useCallback, useEffect } from "react";
import { Navbar, Container, Row, Col, Button, Card } from "react-bootstrap";
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from "@clerk/clerk-react";
import * as XLSX from 'xlsx'; // Added for Excel export
import DataUpload from "./components/DataUpload";
import FPSTable from "./components/FPSTable";
import MapView from "./components/MapView";
import ResultsTable from "./components/ResultsTable";
import AlertManager from "./components/AlertManager";
import LoadingSpinner from "./components/LoadingSpinner";
import StatusIndicator from "./components/StatusIndicator";
import FPSTestPanel from "./components/FPSTestPanel";
import { useAlert } from "./hooks/useAlert";

import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Utility to call /api/ors-matrix
async function fetchORSMatrix(sources, destinations) {
  const locations = [...sources, ...destinations];
  const sourceIndices = sources.map((_, i) => i);
  const destinationIndices = destinations.map((_, i) => i + sources.length);

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    // TEMPORARY FIX: Force direct backend connection for testing
    const backendUrl = 'https://beneficiaryreassignment.onrender.com';
    
    /*
    // Backend URL configuration with fallback logic
    const getBackendURL = () => {
      const envBackendURL = process.env.REACT_APP_BACKEND_URL;
      
      if (envBackendURL && !envBackendURL.includes('localhost')) {
        return envBackendURL;
      }
      
      if (window.location.hostname.includes('vercel.app')) {
        return window.location.origin;
      }
      
      return 'http://localhost:5001';
    };
    
    const backendUrl = getBackendURL();
    */
    
    const response = await fetch(`${backendUrl}/api/ors-matrix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations, sources: sourceIndices, destinations: destinationIndices }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`Matrix API failed: ${response.statusText}`);
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Matrix API request timeout after 60 seconds');
    }
    throw error;
  }
}

// Haversine distance calculation as fallback
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

function parseCoord(val) {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    val = val.trim();
    if (val === "" || val.toLowerCase() === "nan" || val.toLowerCase() === "null") {
      return undefined;
    }
  }
  const num = Number(val);
  return Number.isFinite(num) ? num : undefined;
}

// Existing App content isolated in a separate component for signed-in users
const AppContent = () => {
  const [fpsData, setFpsData] = useState([]);
  const [originalCustomerData, setOriginalCustomerData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [redirectionResults, setRedirectionResults] = useState([]);
  const [showResultsTable, setShowResultsTable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClosedFPS, setSelectedClosedFPS] = useState([]);
  const [visibleFPSIndices, setVisibleFPSIndices] = useState([]);
  const [mapKey, setMapKey] = useState(0);
  const [routeDistances, setRouteDistances] = useState({});

  // Track if user has ever made status changes (sticky flag)
  const [hasEverChangedStatus, setHasEverChangedStatus] = useState(false);
  const [initialFPSState, setInitialFPSState] = useState({});

  const { alerts, addAlert, removeAlert } = useAlert();

  // Upload FPS data, clean and set
  const handleFPSUpload = useCallback(
    (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        addAlert("No valid FPS data found in file.", "danger");
        return;
      }
      const cleaned = data.map((fps) => ({
        ...fps,
        fps_id: String(fps.fps_id).trim(),
        fps_name: String(fps.fps_name).trim(),
        status: String(fps.status).toLowerCase().trim(),
        latitude: parseCoord(fps.latitude),
        longitude: parseCoord(fps.longitude),
      }));

      setFpsData(cleaned);
      setHasEverChangedStatus(false); // Reset when new data uploaded

      // Store initial FPS state
      const initialState = {};
      cleaned.forEach((fps) => {
        initialState[fps.fps_id] = fps.status;
      });
      setInitialFPSState(initialState);

      // Reset visibility to show all FPS by default
      const allIndices = cleaned.map((_, idx) => idx);
      setVisibleFPSIndices(allIndices);

      // Only on new FPS upload, refresh the map
      setMapKey((k) => k + 1);

      addAlert(`Loaded ${cleaned.length} FPS shops.`, "success");
    },
    [addAlert]
  );

  // Upload Beneficiary data, clean and set, assigning fps_name from fpsData
  const handleCustomerUpload = useCallback(
    (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        addAlert("No valid beneficiary data found in file.", "danger");
        return;
      }
      const fpsMap = {};
      fpsData.forEach((fps) => {
        fpsMap[String(fps.fps_id).trim()] = fps.fps_name;
      });
      const cleaned = data.map((cust) => ({
        ...cust,
        FPSCode: String(cust.FPSCode).trim(),
        assigned_fps: fpsMap[String(cust.FPSCode).trim()] || "",
        latitude: parseCoord(cust.latitude),
        longitude: parseCoord(cust.longitude),
        Member_Name_EN: cust.Member_Name_EN || cust.customerName,
      }));
      setOriginalCustomerData(cleaned);
      setCustomerData(cleaned);
      setHasEverChangedStatus(false); // Reset when new data uploaded

      // Only on new beneficiary upload, refresh the map
      setMapKey((k) => k + 1);

      addAlert(`Loaded ${cleaned.length} beneficiaries.`, "success");
    },
    [addAlert, fpsData]
  );

  // FPS selection handler that permanently switches to dynamic mode once changed
  const handleFPSSelection = useCallback(
    (indices) => {
      setSelectedClosedFPS(indices || []);
      const updated = fpsData.map((fps, idx) =>
        indices.includes(idx) ? { ...fps, status: "closed" } : { ...fps, status: "open" }
      );

      // Once any change is made, permanently switch to dynamic mode
      setHasEverChangedStatus(true);
      setFpsData(updated);
      // Do NOT update mapKey here; this was causing unwanted map refreshes
    },
    [fpsData]
  );

  // FPS visibility handler - FIXED: Only affects visibility, not routing calculations
  const handleFPSVisibilityChange = useCallback(
    (visibleIndices) => {
      console.log("App: FPS visibility changed to:", visibleIndices);
      console.log("Previous visibleFPSIndices:", visibleFPSIndices);
      setVisibleFPSIndices(visibleIndices);
      console.log("App: After setState, checking in next tick...");
      setTimeout(() => {
        console.log("App: visibleFPSIndices after setState:", visibleFPSIndices);
      }, 100);
    },
    [visibleFPSIndices]
  );

  // Initial assignment logic (uses designated FPS from upload)
  const handleInitialAssignment = useCallback(async () => {
    if (!originalCustomerData.length || !fpsData.length) return;

    try {
      const fpsNameMap = Object.fromEntries(fpsData.map((f) => [String(f.fps_id), f.fps_name]));
      const results = [];

      // Assign beneficiaries to their designated FPS as per upload data
      originalCustomerData.forEach((cust) => {
        const designatedFPS = fpsData.find((fps) => String(fps.fps_id) === String(cust.FPSCode));
        if (designatedFPS) {
          results.push({
            id: `${cust.Member_Name_EN}_${Date.now()}_${Math.random() * 10000}_initial`,
            customerName: cust.Member_Name_EN,
            oldFPS: "Initial Assignment",
            oldFPSCode: "N/A",
            newFPS: designatedFPS.fps_name,
            newFPSCode: designatedFPS.fps_id,
            distance: "As per upload data",
            isReassigned: false,
            isInitialAssignment: true,
            status: "Initial Assignment", // ADDED: Explicit status
          });
        } else {
          // Handle case where designated FPS is not found
          results.push({
            id: `${cust.Member_Name_EN}_${Date.now()}_${Math.random() * 10000}_error`,
            customerName: cust.Member_Name_EN,
            oldFPS: "FPS Not Found",
            oldFPSCode: cust.FPSCode,
            newFPS: "FPS Not Found",
            newFPSCode: cust.FPSCode,
            distance: "N/A",
            isReassigned: false,
            isInitialAssignment: true,
            status: "Error", // ADDED: Explicit status
          });
        }
      });

      setCustomerData(originalCustomerData); // Keep original assignments
      setRedirectionResults(results);
      setShowResultsTable(true); // FIXED: Show results table after initial assignment

      addAlert(`Initial assignment complete: ${results.length} beneficiaries assigned to their designated FPS shops.`, "info");
    } catch (err) {
      console.error("Initial assignment error:", err);
      addAlert("Error during initial assignment. Please try again.", "danger");
    }
  }, [fpsData, originalCustomerData, addAlert]);

  // Enhanced Dynamic reassignment logic with correct status determination
  const handleDynamicReassignment = useCallback(async () => {
    if (!originalCustomerData.length || !fpsData.length) return;

    try {
      const openFPS = fpsData.filter((fps) => fps.status === "open");
      if (!openFPS.length) {
        setRedirectionResults([]);
        setCustomerData([]);
        setShowResultsTable(false); // FIXED: Hide results when no open FPS
        addAlert("No open FPS shops available for assignment.", "warning");
        return;
      }

      const fpsNameMap = Object.fromEntries(fpsData.map((f) => [String(f.fps_id), f.fps_name]));
      const results = [];
      const newAssignments = [...originalCustomerData];

      // Get all valid customers with coordinates
      const validCustomers = originalCustomerData.filter((cust) => {
        const lat = parseCoord(cust.latitude);
        const lon = parseCoord(cust.longitude);
        return lat != null && lon != null;
      });

      if (validCustomers.length === 0) {
        setRedirectionResults([]);
        setShowResultsTable(false); // FIXED: Hide results when no valid customers
        return;
      }

      // Prepare coordinates for matrix API
      const customerCoords = validCustomers.map((c) => [Number(c.longitude), Number(c.latitude)]);
      const openFpsCoords = openFPS.map((f) => [Number(f.longitude), Number(f.latitude)]);

      let matrixData;
      let useHaversine = false;

      try {
        matrixData = await fetchORSMatrix(customerCoords, openFpsCoords);
      } catch (error) {
        console.warn("Matrix API failed, using haversine distances:", error);
        useHaversine = true;
      }

      // Assign each customer to nearest open FPS
      validCustomers.forEach((cust, custIdx) => {
        let minDist = Infinity;
        let nearestFPSIdx = -1;
        let actualDistance = "N/A";

        if (useHaversine) {
          openFPS.forEach((fps, fpsIdx) => {
            const customerCoord = [Number(cust.longitude), Number(cust.latitude)];
            const fpsCoord = [Number(fps.longitude), Number(fps.latitude)];
            const dist = haversine(customerCoord, fpsCoord);

            if (dist < minDist) {
              minDist = dist;
              nearestFPSIdx = fpsIdx;
              actualDistance = `${(dist / 1000).toFixed(2)} km (straight)`;
            }
          });
        } else {
          const distances = matrixData.distances || [];
          if (Array.isArray(distances[custIdx])) {
            distances[custIdx].forEach((dist, fpsIdx) => {
              if (typeof dist === "number" && dist < minDist) {
                minDist = dist;
                nearestFPSIdx = fpsIdx;
                actualDistance = `${(dist / 1000).toFixed(2)} km`;
              }
            });
          }
        }

        if (nearestFPSIdx >= 0) {
          const nearestFPS = openFPS[nearestFPSIdx];
          const originalAssignedFPS = fpsData.find((fps) => String(fps.fps_id) === String(cust.FPSCode));

          // FIXED: Correct status determination based on actual assignment change
          const originalFPSId = String(cust.FPSCode); // Original assignment from data
          const newFPSId = String(nearestFPS.fps_id); // New assignment after reassignment
          const isActuallyReassigned = originalFPSId !== newFPSId;

          // Create result entry with correct status
          results.push({
            id: `${cust.Member_Name_EN}_${Date.now()}_${Math.random() * 10000}`,
            customerName: cust.Member_Name_EN,
            oldFPS: originalAssignedFPS?.fps_name || "Unknown",
            oldFPSCode: originalFPSId,
            newFPS: nearestFPS.fps_name,
            newFPSCode: newFPSId,
            distance: actualDistance,
            isReassigned: isActuallyReassigned,
            isInitialAssignment: false,
            status: isActuallyReassigned ? "Reassignment" : "Stayed",
          });

          // Update assignment
          const originalIdx = originalCustomerData.indexOf(cust);
          if (originalIdx !== -1) {
            newAssignments[originalIdx] = {
              ...cust,
              FPSCode: nearestFPS.fps_id,
              assigned_fps: nearestFPS.fps_name,
            };
          }
        }
      });

      // Handle customers with invalid coordinates
      originalCustomerData.forEach((cust) => {
        const lat = parseCoord(cust.latitude);
        const lon = parseCoord(cust.longitude);
        if (lat == null || lon == null) {
          results.push({
            id: `${cust.Member_Name_EN}_${Date.now()}_${Math.random() * 10000}_invalid`,
            customerName: cust.Member_Name_EN,
            oldFPS: "Invalid Location",
            oldFPSCode: cust.FPSCode,
            newFPS: "Invalid Location",
            newFPSCode: cust.FPSCode,
            distance: "N/A",
            isReassigned: false,
            isInitialAssignment: false,
            status: "No Change",
          });
        }
      });

      setCustomerData(newAssignments);
      setRedirectionResults(results);
      setShowResultsTable(true);

      // Count actual reassignments vs stayed
      const actualReassignments = results.filter((r) => r.status === "Reassignment").length;
      const stayedCount = results.filter((r) => r.status === "Stayed").length;

      if (actualReassignments > 0 || stayedCount > 0) {
        addAlert(
          `Dynamic reassignment complete: ${actualReassignments} beneficiaries reassigned, ${stayedCount} beneficiaries stayed at their current FPS.`,
          "info"
        );
      }
    } catch (err) {
      console.error("Dynamic reassignment error:", err);
      addAlert("Error during dynamic reassignment. Please try again.", "danger");
    }
  }, [fpsData, originalCustomerData, addAlert]);

  // Enhanced callback to handle distance updates from MapView
  const handleRouteDistanceUpdate = useCallback((distanceUpdates) => {
    setRouteDistances((prev) => ({ ...prev, ...distanceUpdates }));
    setRedirectionResults((prevResults) =>
      prevResults.map((result) => {
        const updatedDistance = distanceUpdates[result.customerName];
        if (updatedDistance) {
          return {
            ...result,
            distance: updatedDistance,
            isRouteUpdated: true,
          };
        }
        return result;
      })
    );
  }, []);

  // Auto assignment when FPS status changes (only dynamic reassignment)
  useEffect(() => {
    if (fpsData.length > 0 && originalCustomerData.length > 0 && hasEverChangedStatus) {
      handleDynamicReassignment();
    }
  }, [fpsData, hasEverChangedStatus, handleDynamicReassignment]);

  // Initial assignment when data is first loaded (only if never changed status)
  useEffect(() => {
    if (fpsData.length > 0 && originalCustomerData.length > 0 && !hasEverChangedStatus) {
      handleInitialAssignment();
    }
  }, [fpsData, originalCustomerData, hasEverChangedStatus, handleInitialAssignment]);

  const downloadResults = useCallback(() => {
    if (!redirectionResults.length) {
      addAlert("No results to download.", "warning");
      return;
    }
    try {
      // Prepare data for Excel export
      const excelData = redirectionResults.map((r) => ({
        'Beneficiary Name': r.customerName,
        'Previous FPS': r.oldFPS,
        'Previous FPS Code': r.oldFPSCode,
        'New FPS': r.newFPS,
        'New FPS Code': r.newFPSCode,
        'Distance': r.distance || "N/A",
        'Status': r.status || (r.isReassigned ? "Reassignment" : "Stayed"),
        'Type': r.isInitialAssignment ? "Initial" : "Dynamic"
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const columnWidths = [
        { wch: 25 }, // Beneficiary Name
        { wch: 20 }, // Previous FPS
        { wch: 15 }, // Previous FPS Code
        { wch: 20 }, // New FPS
        { wch: 15 }, // New FPS Code
        { wch: 12 }, // Distance
        { wch: 15 }, // Status
        { wch: 10 }  // Type
      ];
      worksheet['!cols'] = columnWidths;

      // Add header styling
      const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellRef]) continue;
        worksheet[cellRef].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center" }
        };
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Redirection Results");

      // Generate Excel file and download
      const fileName = `redirection_results_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      addAlert("Excel file downloaded successfully!", "success");
    } catch (err) {
      console.error('Excel export error:', err);
      addAlert(`Error during Excel export: ${err.message}`, "danger");
    }
  }, [redirectionResults, addAlert]);

  const isReady = fpsData.length > 0 && customerData.length > 0;

  return (
    <div className="App">
      <Navbar
        bg="light"
        variant="light"
        className="mb-4"
        style={{ borderBottom: "3px solid #FF6600", padding: "0.75rem 0", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
      >
            <Container className="d-flex align-items-center">
              {/* Government of India Logo */}
              <img
                src="https://upload.wikimedia.org/wikipedia/en/thumb/2/26/Emblem_of_Goa.svg/800px-Emblem_of_Goa.svg.png"
                alt="Government of India"
                style={{ height: 45, width: "auto", marginRight: 15 }}
              />

              {/* Main Title */}
              <div className="d-flex flex-column">
                <div style={{ fontSize: "0.75rem", color: "#666", fontWeight: "500", marginBottom: "-2px" }}>Government of Goa</div>
                <Navbar.Brand
                  className="fw-bold mb-0"
                  style={{ color: "#1a472a", fontSize: "1.3rem", fontFamily: "Arial, sans-serif" }}
                >
                  FPS Beneficiary Redirection System
                </Navbar.Brand>
              </div>

              {/* Optional: Add right side content */}
              <div className="ms-auto d-none d-md-block" style={{ fontSize: "0.85rem", color: "#666" }}></div>

              {/* Clerk UserButton for user avatar and sign-out */}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                    userButtonPopoverCard: "shadow-lg",
                    userButtonPopoverActions: "gap-2",
                  },
                }}
              />
            </Container>
          </Navbar>

          <Container>
            <AlertManager alerts={alerts} onRemoveAlert={removeAlert} />
            {isLoading && <LoadingSpinner />}
            <Row className="mb-4">
              <Col md={6}>
                <DataUpload title="FPS Shops Data" expectedFormat="srno, fps_id, fps_name, latitude, longitude, status" onUpload={handleFPSUpload} dataType="fps" />
              </Col>
              <Col md={6}>
                <DataUpload
                  title="Beneficiary Data"
                  expectedFormat="RationCardNo, FPSCode, MemberId, Member_Name_EN, latitude, longitude"
                  onUpload={handleCustomerUpload}
                  dataType="beneficiaries"
                />
              </Col>
            </Row>
            {fpsData.length > 0 && (
              <Row className="mb-4">
                <Col>
                  <Card>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5>FPS Shops Management</h5>
                        <StatusIndicator fpsData={fpsData} />
                        {hasEverChangedStatus && (
                          <small className="text-warning">
                            <i className="fas fa-exclamation-triangle"></i> Dynamic reassignment mode - Beneficiaries assigned to nearest open FPS
                          </small>
                        )}
                        {!hasEverChangedStatus && (
                          <small className="text-info">
                            <i className="fas fa-info-circle"></i> Initial assignment mode - Beneficiaries assigned to designated FPS
                          </small>
                        )}
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <FPSTable data={fpsData} onSelectionChange={handleFPSSelection} onVisibilityChange={handleFPSVisibilityChange} />
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
            <FPSTestPanel fpsData={fpsData} />
            {!!(fpsData.length || customerData.length) && (
              <Row className="mb-4">
                <Col>
                  <MapView
                    key={`map-${mapKey}`}
                    fpsData={fpsData}
                    customerData={customerData}
                    redirectionResults={redirectionResults}
                    visibleFPSIndices={visibleFPSIndices}
                    onRouteDistanceUpdate={handleRouteDistanceUpdate}
                  />
                </Col>
              </Row>
            )}
            {showResultsTable && redirectionResults.length > 0 && (
              <Row className="mb-4">
                <Col>
                  <Card>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h5>{hasEverChangedStatus ? "Dynamic Reassignment Results" : "Initial Assignment Results"}</h5>
                      <Button onClick={downloadResults}>Download Excel</Button>
                    </Card.Header>
                    <Card.Body>
                      <ResultsTable data={redirectionResults} />
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </Container>
          <footer
            style={{
              backgroundColor: "#f8f9fa",
              borderTop: "3px solid #FF6600",
              marginTop: "auto",
              padding: "2rem 0 1rem 0",
            }}
          >
            <Container>
              {/* Main Footer Content */}
              <div className="row">
                {/* Left Column - Logo and Department Info */}
                <div className="col-md-4 mb-3">
                  <div className="d-flex align-items-start mb-3">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/40px-Emblem_of_India.svg.png"
                      alt="Government of India"
                      style={{ height: 35, marginRight: 10 }}
                    />
                    <div>
                      <h6 style={{ color: "#1a472a", marginBottom: "5px", fontSize: "0.9rem" }}>Government of India</h6>
                      <small style={{ color: "#666" }}>Public Distribution System</small>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "#666", lineHeight: "1.4" }}>
                    FPS Beneficiary Redirection System for efficient food grain distribution and beneficiary management across India.
                  </p>
                </div>

                {/* Middle Column - Quick Links */}
                <div className="col-md-4 mb-3">
                  <h6 style={{ color: "#1a472a", marginBottom: "15px", fontSize: "0.9rem" }}>Quick Links</h6>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    <li style={{ marginBottom: "8px" }}>
                      <a
                        href="#"
                        style={{ color: "#666", textDecoration: "none", fontSize: "0.85rem", transition: "color 0.2s" }}
                        onMouseOver={(e) => (e.target.style.color = "#FF6600")}
                        onMouseOut={(e) => (e.target.style.color = "#666")}
                      >
                        Home
                      </a>
                    </li>
                    <li style={{ marginBottom: "8px" }}>
                      <a
                        href="#"
                        style={{ color: "#666", textDecoration: "none", fontSize: "0.85rem", transition: "color 0.2s" }}
                        onMouseOver={(e) => (e.target.style.color = "#FF6600")}
                        onMouseOut={(e) => (e.target.style.color = "#666")}
                      >
                        About PDS
                      </a>
                    </li>
                    <li style={{ marginBottom: "8px" }}>
                      <a
                        href="#"
                        style={{ color: "#666", textDecoration: "none", fontSize: "0.85rem", transition: "color 0.2s" }}
                        onMouseOver={(e) => (e.target.style.color = "#FF6600")}
                        onMouseOut={(e) => (e.target.style.color = "#666")}
                      >
                        Services
                      </a>
                    </li>
                    <li style={{ marginBottom: "8px" }}>
                      <a
                        href="#"
                        style={{ color: "#666", textDecoration: "none", fontSize: "0.85rem", transition: "color 0.2s" }}
                        onMouseOver={(e) => (e.target.style.color = "#FF6600")}
                        onMouseOut={(e) => (e.target.style.color = "#666")}
                      >
                        Contact Us
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Right Column - Contact Info */}
                <div className="col-md-4 mb-3">
                  <h6 style={{ color: "#1a472a", marginBottom: "15px", fontSize: "0.9rem" }}>Contact Information</h6>
                  <div style={{ fontSize: "0.85rem", color: "#666", lineHeight: "1.6" }}>
                    <div style={{ marginBottom: "8px" }}>
                      <strong>Address:</strong>
                      <br />
                      Department of Food & Public Distribution
                      <br />
                      Krishi Bhawan, New Delhi - 110001
                    </div>
                    <div style={{ marginBottom: "8px" }}>
                      <strong>Email:</strong>{" "}
                      <a href="mailto:support@dfpd.gov.in" style={{ color: "#FF6600", textDecoration: "none" }}>
                        support@dfpd.gov.in
                      </a>
                    </div>
                    <div>
                      <strong>Helpline:</strong>{" "}
                      <a href="tel:1800-111-123" style={{ color: "#FF6600", textDecoration: "none" }}>
                        1800-111-123
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <hr style={{ margin: "1.5rem 0 1rem 0", border: "1px solid #ddd" }} />

              {/* Bottom Footer */}
              <div className="row align-items-center">
                <div className="col-md-8">
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#666" }}>
                    © 2025 Government of India. All rights reserved. |{" "}
                    <a href="#" style={{ color: "#FF6600", textDecoration: "none", marginLeft: "5px" }}>
                      Privacy Policy
                    </a>{" "}
                    |{" "}
                    <a href="#" style={{ color: "#FF6600", textDecoration: "none", marginLeft: "5px" }}>
                      Terms of Use
                    </a>{" "}
                    |{" "}
                    <a href="#" style={{ color: "#FF6600", textDecoration: "none", marginLeft: "5px" }}>
                      Accessibility
                    </a>
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <small style={{ color: "#999", fontSize: "0.75rem" }}>
                    Last Updated: {new Date().toLocaleDateString("en-IN")}
                  </small>
                </div>
              </div>
            </Container>
          </footer>
        </div>
  );
};

// Main App component with Clerk authentication
const App = () => {
  const { isLoaded } = useUser();

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Loading application...</p>
        </div>
      </div>
    );
  }

  try {
    return (
      <>
        <SignedIn>
          <AppContent />
        </SignedIn>

        <SignedOut>
          <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            padding: '20px'
          }}>
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 2rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              maxWidth: '500px',
              width: '100%'
            }}>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ 
                  marginBottom: '0.5rem', 
                  color: '#FF6600',
                  fontSize: '2.2rem',
                  fontWeight: 'bold'
                }}>
                  FPS Redirection System
                </h1>
                <h3 style={{ 
                  marginBottom: '1rem', 
                  color: '#333',
                  fontSize: '1.4rem',
                  fontWeight: 'normal'
                }}>
                  Government of India
                </h3>
                <p style={{ 
                  marginBottom: '0', 
                  color: '#666',
                  fontSize: '1rem',
                  lineHeight: '1.5'
                }}>
                  Beneficiary Management & FPS Shop Assignment Platform
                </p>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ 
                  color: '#555', 
                  fontSize: '1.1rem',
                  marginBottom: '0'
                }}>
                  Please sign in to continue
                </p>
              </div>
              
              <SignIn 
                redirectUrl="/" 
                appearance={{
                  elements: {
                    formButtonPrimary: {
                      backgroundColor: '#FF6600',
                      '&:hover': { backgroundColor: '#e55a00' }
                    },
                    card: {
                      boxShadow: 'none',
                      border: '1px solid #e0e0e0'
                    },
                    headerTitle: { color: '#333' },
                    headerSubtitle: { color: '#666' }
                  }
                }}
              />
              
              <div style={{ 
                marginTop: '2rem', 
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <small style={{ color: '#666', fontSize: '0.85rem' }}>
                  Secure access to manage FPS shop assignments and beneficiary redirections
                </small>
              </div>
            </div>
          </div>
        </SignedOut>
      </>
    );
  } catch (error) {
    console.error('App rendering error:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Application Error</h2>
        <p>There was an error loading the application.</p>
        <p>Error: {error.message}</p>
      </div>
    );
  }
};

export default App;
