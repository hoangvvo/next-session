import React from 'react';
import { withSession } from '../../../../src';
import { NextPage } from 'next';

const Page: NextPage<{views: number}> = ({ views }) => <p>{views}</p>

Page.getInitialProps = ({ req }) => {
  if (req.method === 'GET') req.session.views = req.session.views ? (req.session.views + 1) : 1;
  if (req.method === 'DELETE') req.session.destroy();
  return ({ views: req.session && req.session.views || 0 });
}

export default withSession(Page, { name: 'with-session' });
