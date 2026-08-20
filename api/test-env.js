export default function handler(req, res) {
  const hasCred = !!process.env.GOOGLE_CREDENTIALS_BASE64;
  res.status(200).json({ hasCred, value: process.env.GOOGLE_CREDENTIALS_BASE64 ? 'Definida' : 'Indefinida' });
}