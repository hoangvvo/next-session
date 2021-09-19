import { applySession, MemoryStore } from 'next-session';
import React from 'react';

const store = new MemoryStore();

const Page = ({ views }) => <p>{views}</p>;

export const getServerSideProps = async ({ req, res }) => {
  await applySession(req, res, { name: 'apply-session', store });
  if (req.method === 'GET')
    req.session.views = req.session.views ? req.session.views + 1 : 1;
  if (req.method === 'DELETE') await req.session.destroy();
  return {
    props: { views: (req.session && req.session.views) || 0 }, // will be passed to the page component as props
  };
};

export default Page;
