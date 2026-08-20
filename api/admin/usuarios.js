// api/admin/usuarios.js
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwOYH49gOV2i2FeyEN_thI9yD4NIGyHihzjeyfV4WWp_awmf_KXVAjzHVDY_jM0tdn/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado.' });
  }

  // ========== GET = Listar usuários (via API Key) ==========
  if (req.method === 'GET') {
    try {
      const apiKey = process.env.CHAVE_API_DO_GOOGLE;
      const spreadsheetId = process.env.SPREADSHEET_ID;
      if (!apiKey || !spreadsheetId) {
        return res.status(500).json({ success: false, error: 'Configuração incompleta.' });
      }
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/USUARIOS!A:D?key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!data.values || data.values.length < 2) {
        return res.status(200).json({ success: true, data: [] });
      }
      const headers = data.values[0];
      const colEmail = headers.indexOf('EMAIL');
      const colRole = headers.indexOf('ROLE');
      const colTransp = headers.indexOf('TRANSPORTADORA');
      const colSenha = headers.indexOf('SENHA');
      const usuarios = data.values.slice(1).map(row => ({
        email: row[colEmail]?.trim() || '',
        role: row[colRole]?.trim().toLowerCase() || 'viewer',
        transportadora: row[colTransp]?.trim() || null,
        senha: row[colSenha]?.trim() || '',
      }));
      return res.status(200).json({ success: true, data: usuarios });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========== POST = Adicionar usuário ==========
  if (req.method === 'POST') {
    try {
      const response = await fetch(APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adicionarUsuario',
          ...req.body
        })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========== PUT = Atualizar usuário ==========
  if (req.method === 'PUT') {
    try {
      const response = await fetch(APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'atualizarUsuario',
          ...req.body
        })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========== DELETE = Excluir usuário ==========
  if (req.method === 'DELETE') {
    try {
      const response = await fetch(APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'excluirUsuario',
          email: req.query.email
        })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}