// api/login.js
import { google } from 'googleapis';

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
    // VERIFICAÇÃO DAS VARIÁVEIS DE AMBIENTE
    // ============================================================
    if (!process.env.GOOGLE_CREDENTIALS) {
      console.error('GOOGLE_CREDENTIALS não definida');
      return res.status(500).json({ 
        success: false, 
        error: 'Configuração do servidor incompleta. Contate o administrador.' 
      });
    }

    if (!process.env.SPREADSHEET_ID) {
      console.error('SPREADSHEET_ID não definida');
      return res.status(500).json({ 
        success: false, 
        error: 'Configuração do servidor incompleta. Contate o administrador.' 
      });
    }

    // ============================================================
    // AUTENTICAÇÃO COM A SERVICE ACCOUNT
    // ============================================================
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (parseError) {
      console.error('Erro ao parsear GOOGLE_CREDENTIALS:', parseError);
      return res.status(500).json({ 
        success: false, 
        error: 'Configuração do servidor inválida. Contate o administrador.' 
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // ============================================================
    // LER A ABA USUARIOS
    // ============================================================
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'USUARIOS!A:D', // EMAIL, ROLE, TRANSPORTADORA, SENHA
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return res.status(500).json({ success: false, error: 'Nenhum usuário cadastrado.' });
    }

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
    res.status(200).json({ success: true, ...usuario });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor: ' + error.message 
    });
  }
}
