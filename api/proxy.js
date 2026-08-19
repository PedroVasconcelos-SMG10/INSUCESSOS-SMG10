// api/proxy.js
export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde ao preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 🔽 SUBSTITUA PELA URL DO SEU WEB APP
    const TARGET_URL = 'https://script.google.com/macros/s/AKfycbx9EeXEp3p9w_uky6MuKMI7AnNtQa9oq-uYqxdGfkzHto_2QcV1ATOGxuan57KVaXR-/exec';

    // Constrói a URL com os parâmetros da requisição
    const queryParams = new URLSearchParams(req.query).toString();
    const url = queryParams ? `${TARGET_URL}?${queryParams}` : TARGET_URL;

    console.log(`[Proxy] Chamando: ${url}`);

    // Prepara os headers
    const headers = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

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
    const text = await response.text();

    console.log(`[Proxy] Status: ${response.status}`);
    console.log(`[Proxy] Resposta (primeiros 200 chars): ${text.substring(0, 200)}`);

    // Tenta parsear como JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      // Se não for JSON, retorna erro
      console.error('[Proxy] Resposta não é JSON:', text.substring(0, 500));
      return res.status(500).json({
        success: false,
        error: 'Apps Script retornou resposta inválida (não é JSON). Verifique a URL e as permissões.',
        details: text.substring(0, 200)
      });
    }

    // Retorna a resposta
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('[Proxy] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do proxy: ' + error.message
    });
  }
}
