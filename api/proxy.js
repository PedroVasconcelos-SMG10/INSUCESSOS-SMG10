// api/proxy.js
export default async function handler(req, res) {
  // Cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 🔽 COLOQUE A URL DO SEU WEB APP AQUI
    const TARGET_URL = 'https://script.google.com/macros/s/AKfycbxKpz9xncVNfEDFLYnC7rxAyQLKpLDBb-dIOJhKTpLVOtFVuQzkfZPiqehHf5PqOL-H/exec';

    const queryParams = new URLSearchParams(req.query).toString();
    const url = queryParams ? `${TARGET_URL}?${queryParams}` : TARGET_URL;

    const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (req.method === 'POST') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erro no proxy:', error);
    res.status(500).json({ success: false, error: 'Erro interno do proxy: ' + error.message });
  }
}
