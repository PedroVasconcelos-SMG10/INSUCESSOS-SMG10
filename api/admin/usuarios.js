// api/admin/usuarios.js
// Versão com suporte apenas a leitura (GET), enquanto você configura a Service Account

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado.' });
  }

  // Apenas GET (leitura) por enquanto
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

  // Para POST, PUT, DELETE, retorna erro avisando que precisa configurar Service Account
  return res.status(501).json({
    success: false,
    error: 'Funcionalidade de escrita indisponível. Configure a Service Account para habilitar.',
    instructions: 'Adicione a variável GOOGLE_CREDENTIALS_BASE64 com o JSON da Service Account codificado em Base64.'
  });
}