// api/proxy.js
export default async function handler(req, res) {
  // Cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde ao preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 🔽 SUBSTITUA PELA URL DO SEU WEB APP
    const TARGET_URL = 'https://script.google.com/macros/s/AKfycbw7HDN7kwJt1NJEAVQ3fCubLMzl_woZiMyAV-MA7rQTaMuzlUKiBOo7AloOYOf7i1Cm/exec';

    // Constrói a URL com os parâmetros da requisição
    const queryParams = new URLSearchParams(req.query).toString();
    const url = queryParams ? `${TARGET_URL}?${queryParams}` : TARGET_URL;

    // Prepara os headers (remove o host original)
    const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };

    // Opções da requisição
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    // Se for POST, envia o body
    if (req.method === 'POST') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Faz a requisição para o Apps Script
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    // Retorna a resposta
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erro no proxy:', error);
    res.status(500).json({ success: false, error: 'Erro interno do proxy: ' + error.message });
  }
}
