// api/login.js
export default async function handler(req, res) {
  console.log('[LOGIN] Iniciando...');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const apiKey = process.env.CHAVE_API_DO_GOOGLE;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    console.log('[LOGIN] CHAVE_API:', apiKey ? '✅' : '❌');
    console.log('[LOGIN] SPREADSHEET_ID:', spreadsheetId ? '✅' : '❌');

    if (!apiKey || !spreadsheetId) {
      return res.status(500).json({ success: false, error: 'Configuração incompleta.' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/USUARIOS!A:D?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values || data.values.length < 2) {
      return res.status(500).json({ success: false, error: 'Nenhum usuário cadastrado.' });
    }

    const rows = data.values;
    const headers = rows[0];
    const colEmail = headers.indexOf('EMAIL');
    const colSenha = headers.indexOf('SENHA');
    const colRole = headers.indexOf('ROLE');
    const colTransp = headers.indexOf('TRANSPORTADORA');

    if (colEmail === -1 || colSenha === -1 || colRole === -1) {
      return res.status(500).json({ success: false, error: 'Colunas necessárias não encontradas.' });
    }

    let usuario = null;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[colEmail]?.trim().toLowerCase() === email.toLowerCase()) {
        usuario = {
          email: row[colEmail].trim(),
          senha: row[colSenha]?.trim() || '',
          role: row[colRole]?.trim().toLowerCase() || 'viewer',
          transportadora: row[colTransp]?.trim() || null,
        };
        break;
      }
    }

    if (!usuario) return res.status(401).json({ success: false, error: 'Usuário não encontrado.' });
    if (usuario.senha !== senha) return res.status(401).json({ success: false, error: 'Senha incorreta.' });

    delete usuario.senha;
    res.status(200).json({ success: true, ...usuario });
  } catch (error) {
    console.error('[LOGIN] Erro:', error);
    res.status(500).json({ success: false, error: 'Erro interno: ' + error.message });
  }
}