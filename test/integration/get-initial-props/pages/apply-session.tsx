import React from 'react';
import { applySession, MemoryStore } from '../../../../dist';
import { NextPage } from 'next';

const store = new MemoryStore();

const Page: NextPage<{views: number}> = ({ views }) => <p>{views}</p>

Page.getInitialProps = async ({ req, res }) => {
  await applySession(req, res, { name: 'apply-session', store });
  if (req.method === 'GET') req.session.views = req.session.views ? (req.session.views + 1) : 1;
  if (req.method === 'DELETE') await req.session.destroy();
  return ({ views: req.session && req.session.views || 0 });
}

export default Page;
