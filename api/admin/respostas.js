// api/admin/respostas.js
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmikMcDQPeIAPUSPQtt7YyptVIwB4r8AGfZqOKXjuLlV3OXbtEu-b-ueqzP-J37UT4/exec';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ================================================================
  //  PERMISSÕES: admin, assist-adm e editor podem responder
  // ================================================================
  const userRole = req.headers['x-user-role'];
  const rolesPermitidos = ['admin', 'assist-adm', 'editor'];
  if (!rolesPermitidos.includes(userRole)) {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores, assistentes e operadores.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { rows, action, ids } = req.body || {};

  // ================================================================
  //  AÇÃO DE EXCLUSÃO (usada pelo toggle do admin "Desmarcar")
  // ================================================================
  if (action === 'delete') {
    try {
      const response = await fetch(APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: ids || [] })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('[Respostas] Erro ao excluir:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ================================================================
  //  AÇÃO DE INSERÇÃO (padrão)
  // ================================================================
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, error: 'Nenhum dado para salvar.' });
  }

  try {
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