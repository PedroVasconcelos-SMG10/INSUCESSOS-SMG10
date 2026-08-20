// api/dados.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, nome } = req.query;

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!apiKey || !spreadsheetId) {
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta.'
      });
    }

    let range = '';
    if (action === 'pacotes') {
      range = 'Página1!A:Z';
    } else if (action === 'inventario') {
      range = 'INVENTÁRIO!A:K';
    } else if (action === 'listarAbas') {
      // Fallback para listar abas (já que API Key não permite listar abas)
      return res.status(200).json({
        success: true,
        abas: ['Página1', 'INVENTÁRIO', 'USUARIOS', 'Descrição', 'RESPOSTAS']
      });
    } else if (action === 'lerAba') {
      if (!nome) {
        return res.status(400).json({ error: 'Nome da aba é obrigatório.' });
      }
      range = `${nome}!A:Z`;
    } else {
      return res.status(400).json({ error: 'Ação inválida' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    console.log(`📡 Buscando: ${range}`);

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
      return res.status(200).json({ success: true, data: [] });
    }

    const headers = data.values[0];
    const rows = data.values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
