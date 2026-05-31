import React from "react";
import { Table, Badge } from "react-bootstrap";

const ResultsTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-muted">No redirection results available.</p>;
  }

  // FIXED: Updated to show all distances in black color
  const getDistanceDisplay = (distance, isReassigned, isInitialAssignment, isRouteUpdated) => {
    if (isInitialAssignment) {
      // For initial assignments, show route distance if available, otherwise show designation
      if (isRouteUpdated && distance && distance !== "As per upload data") {
        return <span style={{ color: "black" }}>{distance}</span>;
      }
      return <Badge bg="secondary">As designated</Badge>;
    }
    
    if (!distance || distance === "N/A") {
      return <span className="text-muted">N/A</span>;
    }
    
    if (distance === "0.00 km") {
      return <Badge bg="success">Same location</Badge>;
    }
    
    // FIXED: All distances (road and straight) now display in black
    if (distance.includes("(straight)")) {
      return <span style={{ color: "black" }}>{distance}</span>;
    }
    
    return <span style={{ color: "black" }}>{distance}</span>;
  };

  // Use the status field from the data instead of deriving it
  const getActionType = (result) => {
    const status = result.status;
    
    if (status === "Initial Assignment") {
      return <Badge bg="secondary">Initial Assignment</Badge>;
    }
    if (status === "Reassignment") {
      return <Badge bg="warning">Reassignment</Badge>;
    }
    if (status === "Stayed") {
      return <Badge bg="success">Stayed</Badge>;
    }
    if (status === "No Change") {
      return <Badge bg="info">No Change</Badge>;
    }
    if (status === "Error") {
      return <Badge bg="danger">Error</Badge>;
    }
    
    // Fallback to old logic if status field is missing
    if (result.isInitialAssignment) {
      return <Badge bg="secondary">Initial Assignment</Badge>;
    }
    if (result.isReassigned) {
      return <Badge bg="warning">Reassignment</Badge>;
    }
    return <Badge bg="success">Stayed</Badge>;
  };

  // Check if this is initial assignment
  const isInitialAssignment = data.length > 0 && data[0].isInitialAssignment;

  // Separate based on status field
  const reassignedCustomers = data.filter(r => r.status === "Reassignment");
  const stayedCustomers = data.filter(r => r.status === "Stayed");
  const initialCustomers = data.filter(r => r.status === "Initial Assignment");
  const errorCustomers = data.filter(r => r.status === "Error");

  return (
    <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
      {isInitialAssignment && (
        <div className="mb-3">
          <h6 className="text-secondary">
            <Badge bg="secondary">{initialCustomers.length}</Badge> Beneficiaries Assigned to Designated FPS
          </h6>
          <small className="text-muted">
            Beneficiaries are assigned to their FPS shops as specified in the upload data. Click "Start Routing" to see actual road distances.
          </small>
        </div>
      )}
      
      {!isInitialAssignment && (
        <>
          {reassignedCustomers.length > 0 && (
            <div className="mb-3">
              <h6 className="text-warning">
                <Badge bg="warning">{reassignedCustomers.length}</Badge> Beneficiaries Reassigned to Nearest Open FPS
              </h6>
            </div>
          )}
          {stayedCustomers.length > 0 && (
            <div className="mb-3">
              <h6 className="text-success">
                <Badge bg="success">{stayedCustomers.length}</Badge> Beneficiaries Already at Nearest Open FPS
              </h6>
            </div>
          )}
        </>
      )}
      
      <Table striped hover>
        <thead>
          <tr>
            <th>Beneficiary Name</th>
            <th>Previous Assignment</th>
            <th>Previous FPS Code</th>
            <th>Current Assignment</th>
            <th>Current FPS Code</th>
            <th>Distance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {/* Show initial assignments first (if any) */}
          {initialCustomers.map((result, index) => (
            <tr key={result.id || `initial-${index}`} className="table-light">
              <td>{result.customerName || "N/A"}</td>
              <td>
                <span className="text-muted">{result.oldFPS || "N/A"}</span>
              </td>
              <td>{result.oldFPSCode || "N/A"}</td>
              <td>
                <span className="fps-status-open">{result.newFPS || "N/A"}</span>
              </td>
              <td>{result.newFPSCode || "N/A"}</td>
              <td>{getDistanceDisplay(result.distance, result.isReassigned, result.isInitialAssignment, result.isRouteUpdated)}</td>
              <td>{getActionType(result)}</td>
            </tr>
          ))}
          
          {/* Show reassigned beneficiaries (dynamic mode) */}
          {reassignedCustomers.map((result, index) => (
            <tr key={result.id || `reassigned-${index}`} className="table-warning-light">
              <td>{result.customerName || "N/A"}</td>
              <td>
                <span className="fps-status-closed">{result.oldFPS || "N/A"}</span>
              </td>
              <td>{result.oldFPSCode || "N/A"}</td>
              <td>
                <span className="fps-status-open">{result.newFPS || "N/A"}</span>
              </td>
              <td>{result.newFPSCode || "N/A"}</td>
              <td>{getDistanceDisplay(result.distance, result.isReassigned, result.isInitialAssignment, result.isRouteUpdated)}</td>
              <td>{getActionType(result)}</td>
            </tr>
          ))}
          
          {/* Show beneficiaries who stayed (dynamic mode) */}
          {stayedCustomers.map((result, index) => (
            <tr key={result.id || `stayed-${index}`}>
              <td>{result.customerName || "N/A"}</td>
              <td>
                <span className="fps-status-open">{result.oldFPS || "N/A"}</span>
              </td>
              <td>{result.oldFPSCode || "N/A"}</td>
              <td>
                <span className="fps-status-open">{result.newFPS || "N/A"}</span>
              </td>
              <td>{result.newFPSCode || "N/A"}</td>
              <td>{getDistanceDisplay(result.distance, result.isReassigned, result.isInitialAssignment, result.isRouteUpdated)}</td>
              <td>{getActionType(result)}</td>
            </tr>
          ))}
          
          {/* Show error cases */}
          {errorCustomers.map((result, index) => (
            <tr key={result.id || `error-${index}`} className="table-danger-light">
              <td>{result.customerName || "N/A"}</td>
              <td>{result.oldFPS || "N/A"}</td>
              <td>{result.oldFPSCode || "N/A"}</td>
              <td>{result.newFPS || "N/A"}</td>
              <td>{result.newFPSCode || "N/A"}</td>
              <td>{getDistanceDisplay(result.distance, result.isReassigned, result.isInitialAssignment, result.isRouteUpdated)}</td>
              <td>{getActionType(result)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ResultsTable;
