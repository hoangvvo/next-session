import { createElement } from 'react';
import {
  NextPage,
  NextPageContext,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
  NextComponentType,
} from 'next';

import { applySession } from './core';
import { Options, SessionData } from './types';

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
    return async function WithSession(
      req: NextApiRequest,
      res: NextApiResponse
    ) {
      await applySession(
        req as NextApiRequest & { session: SessionData },
        res,
        options
      );
      return handler(req, res);
    };

  // Pages
  const Page = handler;
  function WithSession(props: any) {
    return createElement(Page, props);
  }
  WithSession.displayName = `withSession(${getDisplayName(Page)})`;
  if (Page.getInitialProps) {
    WithSession.getInitialProps = async (pageCtx: NextPageContext) => {
      // @ts-ignore
      if (typeof window === 'undefined') {
        await applySession(
          pageCtx.req as NonNullable<NextPageContext['req']> & {
            session: SessionData;
          },
          pageCtx.res as NonNullable<NextPageContext['res']>,
          options
        );
      }
      return (Page.getInitialProps as NonNullable<
        NextComponentType['getInitialProps']
      >)(pageCtx);
    };
  }
  return WithSession;
}
