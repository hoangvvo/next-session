import React from 'react';
import { applySession } from '../../../../';

function Page({ views }) {
  return (<p>{views}</p>);
}

Page.getInitialProps = async ({ req, res }) => {
  await applySession(req, res, { name: 'apply-session' });
  if (req.method === 'GET') req.session.views = req.session.views ? (req.session.views + 1) : 1;
  if (req.method === 'DELETE') req.session.destroy();
  return ({ views: req.session && req.session.views || 0 });
}

export default Page;
