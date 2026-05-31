import Papa from "papaparse";

export const parseCSV = (text, expectedHeaders) => {
  try {
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (result.errors && result.errors.length > 0) {
      throw new Error(
        "CSV parsing errors: " + result.errors.map((e) => e.message).join(", ")
      );
    }

    const data = result.data.map((row) => {
      const cleanRow = {};

      // Map headers to expected format
      expectedHeaders.forEach((header) => {
        const lowerHeader = header.toLowerCase();
        const value = row[lowerHeader] ?? row[header] ?? "";
        cleanRow[header] = typeof value === "string" ? value.trim() : value;
      });

      // Convert coordinates to numbers if possible
      if (cleanRow.latitude !== "") {
        const lat = parseFloat(cleanRow.latitude);
        cleanRow.latitude = isNaN(lat) ? null : lat;
      } else {
        cleanRow.latitude = null;
      }

      if (cleanRow.longitude !== "") {
        const lon = parseFloat(cleanRow.longitude);
        cleanRow.longitude = isNaN(lon) ? null : lon;
      } else {
        cleanRow.longitude = null;
      }

      return cleanRow;
    });

    // Filter out rows with invalid or missing required fields
    const validData = data.filter(
      (row) =>
        row.latitude !== null &&
        row.longitude !== null &&
        row.name && // You may want to adjust this to expected field e.g. 'fps_name'
        row.name.length > 0
    );

    return validData;
  } catch (error) {
    throw new Error("Failed to parse CSV: " + error.message);
  }
};
