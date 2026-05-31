import React, { useState, useEffect, useRef, useCallback } from "react";
import { Table, Form, Button } from "react-bootstrap";

const FPSTable = ({ data, onSelectionChange, onVisibilityChange }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [visibleItems, setVisibleItems] = useState([]);
  const initializedRef = useRef(false);

  const handleCheckboxChange = useCallback((index) => {
    const isSelected = selectedItems.includes(index);
    let newSelectedItems;
    if (isSelected) {
      newSelectedItems = selectedItems.filter((item) => item !== index);
    } else {
      newSelectedItems = [...selectedItems, index];
    }
    
    setSelectedItems(newSelectedItems);
    if (onSelectionChange) {
      onSelectionChange(newSelectedItems);
    }
  }, [selectedItems, onSelectionChange]);

  const handleVisibilityToggle = useCallback((index) => {
    const isVisible = visibleItems.includes(index);
    let newVisibleItems;
    if (isVisible) {
      newVisibleItems = visibleItems.filter((item) => item !== index);
    } else {
      newVisibleItems = [...visibleItems, index];
    }
    
    setVisibleItems(newVisibleItems);
    if (onVisibilityChange) {
      onVisibilityChange(newVisibleItems);
    }
  }, [visibleItems, onVisibilityChange]);

  const handleSuperToggle = useCallback(() => {
    if (!data || data.length === 0) return;
    
    const allIndices = data.map((_, idx) => idx);
    const areAllVisible = allIndices.length === visibleItems.length && 
                         allIndices.every(index => visibleItems.includes(index));
    
    const newVisibleItems = areAllVisible ? [] : allIndices;
    setVisibleItems(newVisibleItems);
    
    if (onVisibilityChange) {
      onVisibilityChange(newVisibleItems);
    }
  }, [data, visibleItems, onVisibilityChange]);

  useEffect(() => {
    if (!initializedRef.current && data && data.length > 0) {
      const closedIndices = data
        .map((shop, idx) => (shop.status === "closed" ? idx : null))
        .filter((idx) => idx !== null);

      const allIndices = data.map((_, idx) => idx);
      
      setSelectedItems(closedIndices);
      setVisibleItems(allIndices);
      
      if (onVisibilityChange) {
        onVisibilityChange(allIndices);
      }
      
      initializedRef.current = true;
    }
  }, [data, onVisibilityChange]);

  useEffect(() => {
    const currentDataLength = data ? data.length : 0;
    const prevDataLength = initializedRef.prevDataLength || 0;
    
    if (currentDataLength !== prevDataLength) {
      initializedRef.current = false;
      initializedRef.prevDataLength = currentDataLength;
    }
  }, [data]);

  if (!data || data.length === 0) {
    return <p className="text-muted">No FPS data available.</p>;
  }

  const allIndices = data.map((_, idx) => idx);
  const areAllVisible = allIndices.length > 0 && 
                        visibleItems.length === allIndices.length &&
                        allIndices.every(index => visibleItems.includes(index));

  return (
    <div>
      <div className="mb-3 d-flex justify-content-end">
        <Button 
          variant={areAllVisible ? "outline-danger" : "outline-success"}
          size="sm"
          onClick={handleSuperToggle}
        >
          {areAllVisible ? "Hide All FPS" : "Show All FPS"}
        </Button>
      </div>
      
      <div
        className="table-responsive"
        style={{ maxHeight: "400px", overflowY: "auto" }}
      >
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Mark as Closed</th>
              <th>Show Specific FPS</th>
              <th>Sr No</th>
              <th>FPS ID</th>
              <th>FPS Name</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Current Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((fps, index) => {
              const isCurrentlyClosed = fps.status === "closed";
              const isSelected = selectedItems.includes(index);
              const isVisible = visibleItems.includes(index);
              return (
                <tr key={`fps-${fps.fps_id || index}`}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      id={`fps-closed-${index}`}
                      checked={isSelected}
                      onChange={() => handleCheckboxChange(index)}
                    />
                  </td>
                  <td>
                    <Form.Check
                      type="switch"
                      id={`fps-visibility-${index}`}
                      checked={isVisible}
                      onChange={() => handleVisibilityToggle(index)}
                      label=""
                    />
                  </td>
                  <td>{fps.srno}</td>
                  <td>{fps.fps_id}</td>
                  <td>{fps.fps_name}</td>
                  <td>{Number(fps.latitude).toFixed(6)}</td>
                  <td>{Number(fps.longitude).toFixed(6)}</td>
                  <td>
                    <span
                      className={`fps-status-${
                        isCurrentlyClosed ? "closed" : "open"
                      }`}
                      style={{
                        color: isCurrentlyClosed ? "#dc3545" : "#28a745",
                        fontWeight: "bold"
                      }}
                    >
                      {isCurrentlyClosed ? "Closed" : "Open"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default FPSTable;
