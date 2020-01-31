import { withSession } from '../../../../../src';

function handler(req, res) {
  if (req.method === 'POST')
    req.session.views = req.session.views ? req.session.views + 1 : 1;
  if (req.method === 'DELETE') req.session.destroy();
  res.send(`${(req.session && req.session.views) || 0}`);
}

export default withSession(handler);
