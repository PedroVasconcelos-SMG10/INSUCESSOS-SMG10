// api/dados.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, nome } = req.query;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    let range = '';
    if (action === 'pacotes') {
      range = 'Página1!A:Z';
    } else if (action === 'inventario') {
      range = 'INVENTÁRIO!A:K';
    } else if (action === 'listarAbas') {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const abas = spreadsheet.data.sheets.map(s => s.properties.title);
      return res.status(200).json({ success: true, abas });
    } else if (action === 'lerAba') {
      range = `${nome}!A:Z`;
    } else {
      return res.status(400).json({ error: 'Ação inválida' });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
