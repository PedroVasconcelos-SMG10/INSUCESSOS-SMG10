// api/login.js
export default async function handler(req, res) {
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
// api/login.js (trecho no início da função handler)
console.log('[Login] 🔍 CHAVE_API_DO_GOOGLE:', process.env.CHAVE_API_DO_GOOGLE ? '✅ DEFINIDA' : '❌ UNDEFINED');
console.log('[Login] 🔍 ID_DA_PLANILHA:', process.env.ID_DA_PLANILHA ? '✅ DEFINIDA' : '❌ UNDEFINED');
  try {
    // ============================================================
    // LOGS DE DEPURAÇÃO (NÃO EXPÕE OS VALORES COMPLETOS)
    // ============================================================
    const apiKey = process.env.CHAVE_API_DO_GOOGLE;
    const spreadsheetId = process.env.ID_DA_PLANILHA;

    console.log('[Login] 🔍 CHAVE_API_DO_GOOGLE:', apiKey ? '✅ DEFINIDA (primeiros 10 chars: ' + apiKey.substring(0, 10) + '...)' : '❌ UNDEFINED');
    console.log('[Login] 🔍 ID_DA_PLANILHA:', spreadsheetId ? '✅ DEFINIDA' : '❌ UNDEFINED');

    if (!apiKey) {
      console.error('❌ CHAVE_API_DO_GOOGLE não definida');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta: CHAVE_API_DO_GOOGLE não definida.'
      });
    }

    if (!spreadsheetId) {
      console.error('❌ ID_DA_PLANILHA não definida');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta: ID_DA_PLANILHA não definida.'
      });
    }

    // Buscar dados da planilha (pública)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/USUARIOS!A:D?key=${apiKey}`;

    console.log(`[Login] 📡 Buscando dados da planilha...`);

    const response = await fetch(url);
    const data = await response.json();

    if (!data.values || data.values.length < 2) {
      console.error('❌ Nenhum dado encontrado na planilha');
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

    console.log(`[Login] ✅ Usuário ${usuario.email} autenticado com sucesso`);
    res.status(200).json({ success: true, ...usuario });
  } catch (error) {
    console.error('[Login] ❌ Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor: ' + error.message
    });
  }
}
