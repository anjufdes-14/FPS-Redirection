// Vercel API route to proxy ORS requests to Render backend

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method for the actual request
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed', 
      allowedMethods: ['POST'],
      received: req.method,
      url: req.url
    });
  }

  const BACKEND_URL = 'https://beneficiaryreassignment.onrender.com';
  
  try {
    console.log('Proxying ORS request to backend:', BACKEND_URL);
    console.log('Request body:', req.body);

    const response = await fetch(`${BACKEND_URL}/api/ors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Proxy/1.0'
      },
      body: JSON.stringify(req.body),
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      throw new Error(`Backend responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Successful proxy response');
    res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to proxy request to backend',
      details: error.message,
      backend: BACKEND_URL
    });
  }
}