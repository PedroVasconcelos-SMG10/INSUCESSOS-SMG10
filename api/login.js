// api/login.js
export default async function handler(req, res) {
  // CORS
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
    // ============================================================
    // VARIÁVEIS DE AMBIENTE
    // ============================================================
    const apiKey = process.env.GOOGLE_API_KEY;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!apiKey) {
      console.error('GOOGLE_API_KEY não definida');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta. Contate o administrador.'
      });
    }

    if (!spreadsheetId) {
      console.error('SPREADSHEET_ID não definida');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta. Contate o administrador.'
      });
    }

    // ============================================================
    // BUSCAR DADOS DA PLANILHA (PÚBLICA)
    // ============================================================
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/USUARIOS!A:D?key=${apiKey}`;

    console.log(`[Login] Buscando dados da planilha...`);

    const response = await fetch(url);
    const data = await response.json();

    if (!data.values || data.values.length < 2) {
      console.error('Nenhum dado encontrado na planilha');
      return res.status(500).json({
        success: false,
        error: 'Nenhum usuário cadastrado. Verifique a planilha.'
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

    // ============================================================
    // VERIFICAR CREDENCIAIS
    // ============================================================
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

    // Remove a senha antes de retornar
    delete usuario.senha;

    console.log(`[Login] Usuário ${usuario.email} autenticado com sucesso`);
    res.status(200).json({ success: true, ...usuario });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor: ' + error.message
    });
  }
}
