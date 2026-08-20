import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
  }

  try {
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

    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'USUARIOS!A:D',
      });
      const rows = response.data.values || [];
      if (rows.length < 2) return res.status(200).json({ success: true, data: [] });

      const headers = rows[0];
      const colEmail = headers.indexOf('EMAIL');
      const colRole = headers.indexOf('ROLE');
      const colTransp = headers.indexOf('TRANSPORTADORA');
      const colSenha = headers.indexOf('SENHA');
      const usuarios = rows.slice(1).map(row => ({
        email: row[colEmail]?.trim() || '',
        role: row[colRole]?.trim().toLowerCase() || 'viewer',
        transportadora: row[colTransp]?.trim() || null,
        senha: row[colSenha]?.trim() || '',
      }));

      return res.status(200).json({ success: true, data: usuarios });
    }

    if (req.method === 'POST') {
      const { email, role, transportadora, senha } = req.body;
      if (!email || !senha) {
        return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
      }

      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'USUARIOS!A:A',
      });
      const emails = (existing.data.values || []).map(row => row[0]?.trim().toLowerCase());
      if (emails.includes(email.toLowerCase())) {
        return res.status(409).json({ success: false, error: 'Usuário já existe.' });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'USUARIOS!A:D',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[email, role || 'viewer', transportadora || '', senha]] },
      });

      return res.status(201).json({ success: true, message: 'Usuário adicionado com sucesso.' });
    }

    if (req.method === 'PUT') {
      const { emailOriginal, email, role, transportadora, senha } = req.body;
      if (!emailOriginal) {
        return res.status(400).json({ success: false, error: 'Email original é obrigatório.' });
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'USUARIOS!A:D',
      });
      const rows = response.data.values || [];
      if (rows.length < 2) {
        return res.status(404).json({ success: false, error: 'Nenhum usuário encontrado.' });
      }

      const headers = rows[0];
      const colEmail = headers.indexOf('EMAIL');
      const colRole = headers.indexOf('ROLE');
      const colTransp = headers.indexOf('TRANSPORTADORA');
      const colSenha = headers.indexOf('SENHA');
      let encontrado = false;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[colEmail]?.trim().toLowerCase() === emailOriginal.toLowerCase()) {
          row[colEmail] = email || row[colEmail];
          row[colRole] = role || row[colRole] || 'viewer';
          row[colTransp] = transportadora !== undefined ? transportadora : (row[colTransp] || '');
          row[colSenha] = senha || row[colSenha] || '';
          encontrado = true;
          break;
        }
      }

      if (!encontrado) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'USUARIOS!A:D',
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows },
      });

      return res.status(200).json({ success: true, message: 'Usuário atualizado com sucesso.' });
    }

    if (req.method === 'DELETE') {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ success: false, error: 'E-mail é obrigatório.' });
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'USUARIOS!A:D',
      });
      const rows = response.data.values || [];
      if (rows.length < 2) {
        return res.status(404).json({ success: false, error: 'Nenhum usuário encontrado.' });
      }

      const headers = rows[0];
      const colEmail = headers.indexOf('EMAIL');
      const newRows = [rows[0]];
      let removido = false;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[colEmail]?.trim().toLowerCase() !== email.toLowerCase()) {
          newRows.push(row);
        } else {
          removido = true;
        }
      }

      if (!removido) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'USUARIOS!A:D',
        valueInputOption: 'USER_ENTERED',
        resource: { values: newRows },
      });

      return res.status(200).json({ success: true, message: 'Usuário removido com sucesso.' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('[Admin] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor: ' + error.message });
  }
}
