// api/dados.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, nome } = req.query;

  try {
    const apiKey = process.env.CHAVE_API_DO_GOOGLE;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!apiKey || !spreadsheetId) {
      return res.status(500).json({ success: false, error: 'Configuração incompleta.' });
    }

    // ========== LISTAR ABAS ==========
    if (action === 'listarAbas') {
      // Tenta obter as abas via API (com Service Account, se disponível)
      // Se não tiver, retorna uma lista fixa (fallback)
      try {
        // Tenta usar a Service Account se estiver configurada
        let credentials;
        if (process.env.GOOGLE_CREDENTIALS_BASE64) {
          const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString();
          credentials = JSON.parse(decoded);
          const { google } = await import('googleapis');
          const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          });
          const sheets = google.sheets({ version: 'v4', auth });
          const response = await sheets.spreadsheets.get({ spreadsheetId });
          const abas = response.data.sheets.map(s => s.properties.title);
          return res.status(200).json({ success: true, abas });
        }
      } catch (e) {
        console.warn('Erro ao listar abas com Service Account, usando fallback:', e);
      }

      // Fallback: retorna lista fixa (pode adicionar manualmente as backups)
      // Se você sabe que as backups existem, pode adicionar manualmente:
      const today = new Date();
      const backups = [];
      for (let i = 6; i >= 0; i--) { // Últimos 7 dias
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        backups.push(`BACKUP_${year}-${month}-${day}`);
      }
      return res.status(200).json({
        success: true,
        abas: ['Página1', 'INVENTÁRIO', 'USUARIOS', 'Descrição', 'RESPOSTAS', ...backups]
      });
    }

    // ========== LER ABA ==========
    if (action === 'lerAba') {
      const range = `${nome}!A:Z`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!data.values || data.values.length < 2) {
        return res.status(200).json({ success: true, data: [] });
      }
      const headers = data.values[0];
      const rows = data.values.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      });
      return res.status(200).json({ success: true, data: rows });
    }

    // ========== PACOTES / INVENTÁRIO ==========
    let range = '';
    if (action === 'pacotes') range = 'Página1!A:Z';
    else if (action === 'inventario') range = 'INVENTÁRIO!A:K';
    else return res.status(400).json({ error: 'Ação inválida' });

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.values || data.values.length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }
    const headers = data.values[0];
    const rows = data.values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj;
    });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro em dados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}