import { withSession, MemoryStore } from '../../../../../dist';
import { NextApiRequest, NextApiResponse } from 'next';

const store = new MemoryStore();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET')
    req.session.views = req.session.views ? req.session.views + 1 : 1;
  if (req.method === 'DELETE') await req.session.destroy();
  res.end(String((req.session && req.session.views) || 0));
}

export default withSession(handler, { name: 'with-session', store });
