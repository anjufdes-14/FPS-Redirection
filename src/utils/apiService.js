// src/utils/apiService.js

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export const apiService = {
  // Upload FPS data
  uploadFPS: async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/upload-fps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to upload FPS data');
      return await response.json();
    } catch (error) {
      console.error('uploadFPS error:', error);
      throw error;
    }
  },

  // Upload beneficiary data
  uploadCustomers: async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/upload-beneficiaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to upload beneficiary data');
      return await response.json();
    } catch (error) {
      console.error('uploadCustomers error:', error);
      throw error;
    }
  },

  // Trigger redirection
  redirectCustomers: async (closedFPSIds) => {
    try {
      const response = await fetch(`${API_BASE_URL}/redirect-beneficiaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ closedFPSIds }),
      });
      if (!response.ok) throw new Error('Failed to redirect beneficiaries');
      return await response.json();
    } catch (error) {
      console.error('redirectCustomers error:', error);
      throw error;
    }
  },

  // Get results
  getResults: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/results`);
      if (!response.ok) throw new Error('Failed to fetch results');
      return await response.json();
    } catch (error) {
      console.error('getResults error:', error);
      throw error;
    }
  },
};
