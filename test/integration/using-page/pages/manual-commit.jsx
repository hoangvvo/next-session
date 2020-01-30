import React from 'react';
import { withSession } from '../../../../lib';

function Page({ views }) {
  return <p>{views}</p>;
}

Page.getInitialProps = ({ req }) => {
  req.session.views = req.session.views ? req.session.views + 1 : 1;
  if (req.method === 'POST') req.session.commit();
  return { views: req.session.views };
};

export default withSession(Page, { autoCommit: false });
