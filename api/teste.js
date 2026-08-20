export default function handler(req, res) {
  res.status(200).json({ 
    success: true, 
    message: 'API está funcionando!',
    env: {
      hasApiKey: !!process.env.CHAVE_API_DO_GOOGLE,
      hasSpreadsheetId: !!process.env.SPREADSHEET_ID
    }
  });
}
