import { withSession } from '../../../../../';

async function handler(req, res) {
  if (req.method === 'GET') req.session.views = req.session.views ? (req.session.views + 1) : 1;
  if (req.method === 'DELETE') req.session.destroy();
  res.end(String(req.session && req.session.views || 0))
}

export default withSession(handler, { name: 'with-session' });
