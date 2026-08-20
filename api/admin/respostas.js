// api/admin/respostas.js
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFbSONJqqpg23dnNak2MfLNSHM2rc2AD_KyMlYgif_2qvB94bIKEky1EgkEi-jfBHn/exec'; // <-- SUBSTITUA

export default async function handler(req, res) {
  console.log('[Respostas] Iniciando...');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[Respostas] OPTIONS request');
    return res.status(200).end();
  }

  const userRole = req.headers['x-user-role'];
  console.log('[Respostas] userRole:', userRole);

  if (userRole !== 'admin') {
    console.log('[Respostas] Acesso negado - role:', userRole);
    return res.status(403).json({ success: false, error: 'Acesso negado.' });
  }

  if (req.method !== 'POST') {
    console.log('[Respostas] Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { rows } = req.body;
  console.log('[Respostas] rows recebido:', rows);
  console.log('[Respostas] rows é array?', Array.isArray(rows));
  console.log('[Respostas] rows length:', rows?.length);

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    console.log('[Respostas] Nenhum dado válido');
    return res.status(400).json({ success: false, error: 'Nenhum dado para salvar.' });
  }

  try {
    console.log('[Respostas] Chamando Apps Script...');
    const response = await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'salvarRespostas',
        rows
      })
    });

    const text = await response.text();
    console.log('[Respostas] Resposta do Apps Script (status):', response.status);
    console.log('[Respostas] Resposta do Apps Script (texto):', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[Respostas] Apps Script não retornou JSON:', text);
      return res.status(500).json({ success: false, error: 'Apps Script retornou resposta inválida.' });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Respostas] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor: ' + error.message });
  }
}