// api/admin/respostas.js
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmikMcDQPeIAPUSPQtt7YyptVIwB4r8AGfZqOKXjuLlV3OXbtEu-b-ueqzP-J37UT4/exec';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ================================================================
  //  PERMISSÕES: ADMIN e EDITOR podem responder
  // ================================================================
  const userRole = req.headers['x-user-role'];
if (userRole !== 'admin' && userRole !== 'editor') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores e operadores.' });
}

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { rows } = req.body;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, error: 'Nenhum dado para salvar.' });
  }

  try {
    // ================================================================
    //  CHAMAR O APPS SCRIPT PARA SALVAR AS RESPOSTAS
    // ================================================================
    const response = await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'salvarRespostas',
        rows
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Respostas] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor: ' + error.message 
    });
  }
}