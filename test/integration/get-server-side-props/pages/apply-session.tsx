import React from 'react';
import { applySession, Session } from '../../../../src';
import { IncomingMessage, ServerResponse } from 'http';

function Page({ views }) {
  return (<p>{views}</p>);
}

export async function getServerSideProps({ req, res }: { req: IncomingMessage & { session: Session }, res: ServerResponse }) {
  await applySession(req, res, { name: 'apply-session' });
  if (req.method === 'GET') req.session.views = req.session.views ? (req.session.views + 1) : 1;
  if (req.method === 'DELETE') req.session.destroy();
  return {
    props: { views: req.session && req.session.views || 0 }, // will be passed to the page component as props
  }
}

export default Page;
