const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, Ultron-Cloud-Appid, orgid');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract the actual API path
    const apiPath = req.url.replace('/api/proxy', '');
    
    // Determine the target API URL
    let apiUrl;
    if (apiPath.startsWith('/usr/v4/') || apiPath.startsWith('/device/v1/')) {
      apiUrl = `https://api.ultroncloud.com${apiPath}`;
    } else {
      apiUrl = `https://cms-doraemon.appspot.com${apiPath}`;
    }

    console.log('Proxying request to:', apiUrl);

    // Prepare request configuration
    const config = {
      method: req.method,
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': req.headers['x-api-key'],
        'Ultron-Cloud-Appid': req.headers['ultron-cloud-appid'],
        'orgid': req.headers['orgid']
      }
    };

    // Add request body if present
    if (req.body && Object.keys(req.body).length > 0) {
      config.data = req.body;
    }

    // Make the request to UltronSMART API
    const response = await axios(config);
    
    // Return the response
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    if (error.response) {
      // API returned an error
      res.status(error.response.status).json({
        result: error.response.data.result || error.response.status,
        error: error.response.data.error || 'API Error',
        message: error.response.data.message || error.response.statusText || error.message,
        data: error.response.data
      });
    } else if (error.request) {
      // Request failed
      res.status(503).json({
        result: 503,
        error: 'Service Unavailable',
        message: 'Unable to reach UltronSMART API'
      });
    } else {
      // Other error
      res.status(500).json({
        result: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};