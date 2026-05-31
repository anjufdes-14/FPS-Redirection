import axios from 'axios';

// Backend URL configuration - FORCE BACKEND CONNECTION
const getBackendURL = () => {
  // FIXED: Always use direct backend - no fallback logic
  const DIRECT_BACKEND = 'https://beneficiaryreassignment.onrender.com';
  console.log('🔧 ORSService FORCED Backend URL:', DIRECT_BACKEND);
  return DIRECT_BACKEND;
};

const PROXY_ORS_MATRIX_URL = `${getBackendURL()}/api/ors-matrix`;

// Retry function with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check if error is worth retrying (timeout, network error, or 5xx status)
      const shouldRetry = error.code === 'ECONNABORTED' || 
                         error.message.includes('timeout') ||
                         error.message.includes('Network Error') ||
                         (error.response?.status >= 500);
      
      if (!shouldRetry) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`ORS API attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const getORSMatrix = async (origins, destinations) => {
  console.log('ORS Matrix called with:', { origins: origins.length, destinations: destinations.length });
  
  // Validate input arrays
  if (!Array.isArray(origins) || !Array.isArray(destinations)) {
    console.warn('Invalid input arrays to getORSMatrix');
    return [];
  }

  // Filter invalid coords from destinations to avoid API errors
  const validDestinations = destinations.filter(dest =>
    Array.isArray(dest) &&
    dest.length === 2 &&
    !isNaN(dest[0]) && !isNaN(dest[1]) &&
    Math.abs(dest[0]) <= 180 && Math.abs(dest[1]) <= 90
  );
  
  if (validDestinations.length === 0) {
    console.warn('No valid destinations for ORS matrix');
    return [];
  }

  const requestPayload = {
    locations: [...origins, ...validDestinations],
    sources: origins.map((_, i) => i),
    destinations: validDestinations.map((_, i) => origins.length + i),
    metrics: ['distance'],
    units: 'm',
    resolve_locations: true,
    optimized: false,
  };

  try {
    console.log('Making ORS matrix request to:', PROXY_ORS_MATRIX_URL);
    const response = await retryWithBackoff(
      () => axios.post(PROXY_ORS_MATRIX_URL, requestPayload, { 
        timeout: 60000, // Increased timeout to 60 seconds
        headers: {
          'Content-Type': 'application/json'
        }
      }),
      3, // 3 retry attempts
      2000 // 2 second base delay
    );
    
    console.log('ORS matrix response received, distances shape:', response.data.distances?.length);
    
    // Return distances matrix of shape [origins.length][destinations.length]
    return response.data.distances || [];
  } catch (error) {
    console.error('ORS Proxy API error after retries:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: PROXY_ORS_MATRIX_URL
    });
    
    // Return empty matrix as fallback
    console.warn('Falling back to empty distance matrix');
    return [];
  }
};

