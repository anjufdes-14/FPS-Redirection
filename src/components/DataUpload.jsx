import React, { useState } from "react";
import { Card, Form, Button } from "react-bootstrap";
import * as XLSX from "xlsx";

// Helper to standardize object keys by trimming spaces
const standardizeKeys = (obj) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    newObj[key.trim()] = obj[key];
  });
  return newObj;
};

const DataUpload = ({ title, expectedFormat, onUpload, dataType }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    // Allow only Excel files (.xlsx or .xls)
    if (
      selectedFile &&
      !(
        selectedFile.name.toLowerCase().endsWith(".xlsx") ||
        selectedFile.name.toLowerCase().endsWith(".xls")
      )
    ) {
      alert("Only Excel files (.xlsx or .xls) are allowed.");
      e.target.value = null; // Reset input
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select an Excel file first.");
      return;
    }
    setIsUploading(true);
    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      jsonData = jsonData.map(standardizeKeys);

      const expectedHeaders =
        dataType === "fps"
          ? ["srno", "fps_id", "fps_name", "latitude", "longitude", "status"]
          : ["RationCardNo", "FPSCode", "MemberId", "Member_Name_EN", "latitude", "longitude"];

      const actualHeaders = Object.keys(jsonData[0] || {});

      const missingHeaders = expectedHeaders.filter(
        (header) => !actualHeaders.includes(header)
      );
      if (missingHeaders.length > 0) {
        throw new Error(`Missing columns: ${missingHeaders.join(", ")}`);
      }

      if (dataType === "fps") {
        // FIXED: Process FPS data with proper ID normalization
        jsonData = jsonData.map((row) => ({
          ...row,
          fps_id: String(row.fps_id).replace('.0', '').trim(), // FIXED: Remove .0 suffix
          fps_name: String(row.fps_name).trim(),
          status: String(row.status).toLowerCase().trim(),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
        }));
        
        // Debug logging for FPS data
        console.log('FPS Data Processing:', {
          totalRows: jsonData.length,
          sampleRow: jsonData[0],
          firstFewRows: jsonData.slice(0, 5)
        });
        
        // Check for invalid coordinates
        const invalidRows = jsonData.filter(row => 
          isNaN(row.latitude) || isNaN(row.longitude) ||
          row.latitude === null || row.longitude === null
        );
        
        if (invalidRows.length > 0) {
          console.warn('Invalid FPS coordinates found:', invalidRows);
        }
        
        // FIXED: Log processed data with correct structure
        console.log('Processed FPS Data:', jsonData.map(fps => ({
          fps_id: fps.fps_id,        // FIXED: Use fps_id not id
          fps_name: fps.fps_name,    // FIXED: Use fps_name not name  
          latitude: fps.latitude,    // FIXED: Use latitude not lat
          longitude: fps.longitude,  // FIXED: Use longitude not lon
          status: fps.status
        })));
        
      } else if (dataType === "beneficiaries") {
        // FIXED: Process beneficiary data with proper FPSCode normalization
        jsonData = jsonData.map((row) => ({
          ...row,
          FPSCode: String(row.FPSCode).trim(), // Keep FPSCode as-is (no .0 suffix)
          Member_Name_EN: String(row.Member_Name_EN || '').trim(),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          assigned_fps: "", // to be set later by parent
        }));
        
        // Debug logging for beneficiary data
        console.log('Beneficiary Data Processing:', {
          totalRows: jsonData.length,
          sampleRow: jsonData[0],
          firstFewRows: jsonData.slice(0, 5)
        });
        
        // Check for invalid coordinates
        const invalidRows = jsonData.filter(row => 
          isNaN(row.latitude) || isNaN(row.longitude) ||
          row.latitude === null || row.longitude === null
        );
        
        if (invalidRows.length > 0) {
          console.warn('Invalid beneficiary coordinates found:', invalidRows);
        }
        
        // Log FPS codes to verify matching will work
        const uniqueFPSCodes = [...new Set(jsonData.map(row => row.FPSCode))];
        console.log('Unique FPS Codes in beneficiary data:', uniqueFPSCodes);
      }

      // FIXED: Validate data before passing to parent
      if (jsonData.length === 0) {
        throw new Error("No valid data found in the file.");
      }

      onUpload(jsonData);

      setFile(null);
      document.getElementById(`${dataType}-file`).value = null;
      
      // Success message
      alert(`Successfully uploaded ${jsonData.length} ${dataType} records.`);
      
    } catch (error) {
      console.error(`Error processing ${dataType} data:`, error);
      alert(`Error reading file: ${error.message}`);
    }
    setIsUploading(false);
  };

  return (
    <Card>
      <Card.Header>
        <h5>{title}</h5>
      </Card.Header>
      <Card.Body>
        <Form.Group>
          <Form.Control
            type="file"
            id={`${dataType}-file`}
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="mb-2"
          />
          <Form.Text className="text-muted">Excel format: {expectedFormat}</Form.Text>
        </Form.Group>
        <Button onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading ? "Uploading..." : `Upload ${title}`}
        </Button>
        {file && (
          <div className="mt-2">
            <small className="text-info">Selected: {file.name}</small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default DataUpload;
