// api/admin/respostas.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verifica se é admin
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { rows } = req.body; // rows é um array de arrays: [ID, Transportadora, Motorista, Nome, Justificativa, Data_Hora]
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, error: 'Nenhum dado para salvar.' });
  }

  try {
    // Carregar credenciais
    let credentials;
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString();
      credentials = JSON.parse(decoded);
    } else if (process.env.GOOGLE_CREDENTIALS) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } else {
      throw new Error('Credenciais não configuradas');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Adicionar na aba RESPOSTAS
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'RESPOSTAS!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values: rows },
    });

    return res.status(201).json({ success: true, message: 'Respostas salvas com sucesso.' });
  } catch (error) {
    console.error('[Respostas] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor: ' + error.message });
  }
}