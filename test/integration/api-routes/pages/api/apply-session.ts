import { applySession, Session } from '../../../../../src';
import { NextApiRequest, NextApiResponse } from 'next';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await applySession(req, res, { name: 'apply-session' });
  if (req.method === 'GET') req.session.views = req.session.views ? (req.session.views + 1) : 1;
  if (req.method === 'DELETE') req.session.destroy();
  res.end(String(req.session && req.session.views || 0))
}

export default handler;
