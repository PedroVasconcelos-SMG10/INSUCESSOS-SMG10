// api/login.js
export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    // ⚠️ VERIFICAÇÃO DAS VARIÁVEIS
    const apiKey = process.env.GOOGLE_API_KEY;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    console.log('🔑 API Key:', apiKey ? '✅ Definida' : '❌ Indefinida');
    console.log('📊 Spreadsheet ID:', spreadsheetId ? '✅ Definido' : '❌ Indefinido');

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Configuração: GOOGLE_API_KEY não definida.' });
    }

    if (!spreadsheetId) {
      return res.status(500).json({ success: false, error: 'Configuração: SPREADSHEET_ID não definido.' });
    }

    // 🔍 URL da planilha pública
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/USUARIOS!A:D?key=${apiKey}`;

    console.log('📡 Fazendo requisição para Google Sheets...');

    const response = await fetch(url);

    if (!response.ok) {
      const erro = await response.text();
      console.error('Erro na requisição:', response.status, erro);
      return res.status(500).json({
        success: false,
        error: `Erro ao acessar a planilha: ${response.status}`
      });
    }

    const data = await response.json();

    if (!data.values || data.values.length < 2) {
      return res.status(500).json({
        success: false,
        error: 'Nenhum usuário cadastrado na planilha.'
      });
    }

    const rows = data.values;
    const headers = rows[0];
    const colEmail = headers.indexOf('EMAIL');
    const colSenha = headers.indexOf('SENHA');
    const colRole = headers.indexOf('ROLE');
    const colTransp = headers.indexOf('TRANSPORTADORA');

    if (colEmail === -1 || colSenha === -1 || colRole === -1) {
      return res.status(500).json({
        success: false,
        error: 'Colunas necessárias não encontradas: EMAIL, ROLE, SENHA.'
      });
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

    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Usuário não encontrado.' });
    }

    if (usuario.senha !== senha) {
      return res.status(401).json({ success: false, error: 'Senha incorreta.' });
    }

    delete usuario.senha;

    console.log(`✅ Login bem-sucedido: ${usuario.email}`);
    res.status(200).json({ success: true, ...usuario });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor: ' + error.message
    });
  }
}
