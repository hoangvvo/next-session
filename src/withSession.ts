import {
  NextApiHandler,
  NextComponentType,
  NextPage,
  NextPageContext
} from 'next';
import { createElement } from 'react';
import { applySession } from './core.js';
import { Options } from './types.js';

function getDisplayName(WrappedComponent: NextComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

function isNextApiHandler(
  handler: NextApiHandler | NextPage
): handler is NextApiHandler {
  return handler.length > 1;
}

export default function withSession<T = {}>(
  handler: NextApiHandler | NextPage,
  options?: Options
): NextApiHandler | NextPage {
  // API Routes
  if (isNextApiHandler(handler))
    return async function WithSession(req, res) {
      await applySession(req, res, options);
      return handler(req, res);
    } as NextApiHandler;

  // Pages
  const Page = handler;
  function WithSession(props: any) {
    return createElement(Page, props);
  }
  WithSession.displayName = `withSession(${getDisplayName(Page)})`;
  if (Page.getInitialProps) {
    WithSession.getInitialProps = async (pageCtx: NextPageContext) => {
      if (typeof window === 'undefined') {
        await applySession(pageCtx.req!, pageCtx.res!, options);
      }
      return Page.getInitialProps!(pageCtx);
    };
  }
  return WithSession;
}
