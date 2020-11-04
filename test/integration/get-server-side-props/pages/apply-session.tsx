import React from 'react';
import { applySession, MemoryStore } from '../../../../dist';
import { NextPage, GetServerSideProps } from 'next';

const store = new MemoryStore()

const Page: NextPage<{views: number}> = ({ views }) => <p>{views}</p>

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  await applySession(req, res, { name: 'apply-session', store });
  if (req.method === 'GET') req.session.views = req.session.views ? (req.session.views + 1) : 1;
  if (req.method === 'DELETE') await req.session.destroy();
  return {
    props: { views: req.session && req.session.views || 0 }, // will be passed to the page component as props
  }
}

export default Page;
