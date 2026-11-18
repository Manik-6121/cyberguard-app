import { generateChatReply } from '../lib/cyberguard.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body ?? {};
  if (typeof body === 'string') {
    try {
      body = body ? JSON.parse(body) : {};
    } catch {
      return res.status(400).json({ error: 'Invalid JSON request body.' });
    }
  }

  const { message, history } = body;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'A non-empty message is required.' });
  }

  const result = await generateChatReply(message, history);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.status(200).json({ text: result.text });
}
