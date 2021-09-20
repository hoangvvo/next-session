import {
  NextApiHandler,
  NextComponentType,
  NextPage,
  NextPageContext,
} from 'next';
import { createElement } from 'react';
import { applySession } from './core';
import { Options } from './types';

function getDisplayName(WrappedComponent: NextComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

function isNextApiHandler<T>(
  handler: NextApiHandler | NextApiHandlerWithSession<T> | NextPage
): handler is NextApiHandler | NextApiHandlerWithSession<T> {
  return handler.length > 1;
}

export default function withSession<T = {}>(
  handler: NextApiHandlerWithSession<T> | NextApiHandler | NextPage,
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

export type NextApiRequestWithSession<Session> = NextApiRequest & {
  session: Session & {
    save(): Promise<void>;
  };
};

export interface NextApiHandlerWithSession<Session> {
  (
    req: NextApiRequestWithSession<Session>,
    res: NextApiResponse
  ): void | Promise<void>;
}

export function nextApiHandlerWithSession<Session>(
  handler: NextApiHandlerWithSession<Session>,
  options?: Options
) {
  return withSession(handler, options);
}
