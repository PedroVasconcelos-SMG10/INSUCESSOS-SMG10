// api/login.js
export default async function handler(req, res) {
  console.log('=== [LOGIN] INÍCIO DA REQUISIÇÃO ===');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[LOGIN] OPTIONS request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('[LOGIN] Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  console.log('[LOGIN] Body recebido:', req.body);

  const { email, senha } = req.body;

  if (!email || !senha) {
    console.log('[LOGIN] E-mail ou senha ausentes');
    return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    // ============================================================
    // VARIÁVEIS DE AMBIENTE
    // ============================================================
    const apiKey = process.env.CHAVE_API_DO_GOOGLE;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    console.log('[LOGIN] CHAVE_API_DO_GOOGLE:', apiKey ? '✅ DEFINIDA (primeiros 10: ' + apiKey.substring(0, 10) + '...)' : '❌ UNDEFINED');
    console.log('[LOGIN] SPREADSHEET_ID:', spreadsheetId ? '✅ DEFINIDA' : '❌ UNDEFINED');

    if (!apiKey) {
      console.error('[LOGIN] CHAVE_API_DO_GOOGLE não definida');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta: CHAVE_API_DO_GOOGLE não definida.'
      });
    }

    if (!spreadsheetId) {
      console.error('[LOGIN] SPREADSHEET_ID não definida');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta: SPREADSHEET_ID não definida.'
      });
    }

    // ============================================================
    // CONSTRUIR URL E FAZER REQUISIÇÃO
    // ============================================================
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/USUARIOS!A:D?key=${apiKey}`;

    console.log('[LOGIN] URL da requisição:', url.replace(apiKey, '****'));

    const response = await fetch(url);
    console.log('[LOGIN] Status da resposta:', response.status);

    const data = await response.json();
    console.log('[LOGIN] Dados recebidos?', data.values ? `✅ ${data.values.length} linhas` : '❌ Sem dados');

    if (!data.values || data.values.length < 2) {
      console.error('[LOGIN] Nenhum dado encontrado na planilha');
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

    console.log('[LOGIN] Colunas: EMAIL=' + colEmail + ', SENHA=' + colSenha + ', ROLE=' + colRole);

    if (colEmail === -1 || colSenha === -1 || colRole === -1) {
      console.error('[LOGIN] Colunas necessárias não encontradas');
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
        console.log('[LOGIN] Usuário encontrado:', usuario.email);
        break;
      }
    }

    if (!usuario) {
      console.log('[LOGIN] Usuário não encontrado:', email);
      return res.status(401).json({ success: false, error: 'Usuário não encontrado.' });
    }

    if (usuario.senha !== senha) {
      console.log('[LOGIN] Senha incorreta para:', email);
      return res.status(401).json({ success: false, error: 'Senha incorreta.' });
    }

    delete usuario.senha;

    console.log('[LOGIN] ✅ Autenticação bem-sucedida:', usuario.email);
    res.status(200).json({ success: true, ...usuario });
  } catch (error) {
    console.error('[LOGIN] ❌ Erro capturado:', error);
    console.error('[LOGIN] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor: ' + error.message
    });
  }
}