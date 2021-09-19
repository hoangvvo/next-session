import { MemoryStore, withSession } from 'next-session';
import React from 'react';

const store = new MemoryStore();

const Page = ({ views }) => <p>{views}</p>;

Page.getInitialProps = async ({ req }) => {
  if (req.method === 'GET')
    req.session.views = req.session.views ? req.session.views + 1 : 1;
  if (req.method === 'DELETE') await req.session.destroy();
  return { views: (req.session && req.session.views) || 0 };
};

export default withSession(Page, { name: 'with-session', store });
