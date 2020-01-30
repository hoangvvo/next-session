import React from 'react';
import { withSession } from '../../../../lib';

function Page({ views }) {
  return <p>{views}</p>;
}

Page.getInitialProps = ({ req }) => {
  req.session.views = req.session.views ? req.session.views + 1 : 1;
  return { views: (req.session && req.session.views) || 0 };
};

export default withSession(Page, { cookie: { maxAge: 1 } });
