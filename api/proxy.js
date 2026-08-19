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
    // 🔽 SUBSTITUA PELA URL CORRETA DO SEU WEB APP
    const TARGET_URL = https://script.google.com/macros/s/AKfycbygQQggppWGOcb-WthkJ22tR4Jf7EcCecCubapINdIWXXYjshPvLoVHhezkKnh_WQcx/exec';

    // Constrói a URL com os parâmetros (para GET)
    const queryParams = new URLSearchParams(req.query).toString();
    const url = queryParams ? `${TARGET_URL}?${queryParams}` : TARGET_URL;

    // Headers da requisição para o Apps Script
    const headers = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    // Se for POST, adiciona o body
    if (req.method === 'POST') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    console.log(`[Proxy] Encaminhando ${req.method} para ${url}`);

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    // Verifica se a resposta é JSON
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[Proxy] Resposta não é JSON. Status:', response.status);
      console.error('[Proxy] Conteúdo:', text.substring(0, 500));
      throw new Error(`Resposta do Apps Script não é JSON (status ${response.status}). Verifique a URL e as permissões.`);
    }

    const data = await response.json();

    // Retorna a resposta com o status original
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do proxy: ' + error.message,
    });
  }
}
