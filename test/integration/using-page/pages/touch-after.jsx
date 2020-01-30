import React from 'react';
import { withSession } from '../../../../lib';

function Page({ expires }) {
  return <p>{expires}</p>;
}

Page.getInitialProps = ({ req }) => {
  req.session.test = 0;
  return {
    expires: req.session.cookie && req.session.cookie.expires.valueOf()
  };
};

export default withSession(Page, {
  touchAfter: 5000,
  rolling: true,
  cookie: { maxAge: 60 * 60 * 24 }
});
