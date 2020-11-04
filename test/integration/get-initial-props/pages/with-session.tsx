import React from 'react';
import { withSession, MemoryStore } from '../../../../dist';
import { NextPage } from 'next';

const store = new MemoryStore();

const Page: NextPage<{views: number}> = ({ views }) => <p>{views}</p>

Page.getInitialProps = async ({ req }) => {
  if (req.method === 'GET') req.session.views = req.session.views ? (req.session.views + 1) : 1;
  if (req.method === 'DELETE') await req.session.destroy();
  return ({ views: req.session && req.session.views || 0 });
}

export default withSession(Page, { name: 'with-session', store });
