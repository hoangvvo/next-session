import { createElement } from "react";
import { NextPage, NextPageContext, NextApiHandler, NextApiRequest, NextApiResponse, NextComponentType } from 'next';
import { AppContext } from 'next/app';
import { applySession } from "./core";
import { Options } from "./types";
import { ServerResponse, IncomingMessage } from "http";

function getDisplayName(WrappedComponent: NextComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || "Component";
}

function isNextApiHandler(handler: NextApiHandler | NextPage): handler is NextApiHandler {
  return handler.length > 1;
}

export default function withSession(handler: NextApiHandler | NextPage, options?: Options): NextApiHandler | NextPage {
  // API Routes
  if (isNextApiHandler(handler))
    return async function WithSession(req: NextApiRequest, res: NextApiResponse) {
      await applySession(req, res, options);
      return handler(req, res);
    };

  // Pages
  const Page = handler;
  function WithSession(props: any) {
    return createElement(Page, props);
  }
  WithSession.displayName = `withSession(${getDisplayName(Page)})`;
  if (Page.getInitialProps) {
    WithSession.getInitialProps = async (pageCtx: AppContext | NextPageContext) => {
      const ctx = "Component" in pageCtx ? pageCtx.ctx : pageCtx;
      // @ts-ignore
      if (typeof window === "undefined") {
        const { req, res } = ctx;
        await applySession(req as IncomingMessage, res as ServerResponse, options);
      }
      return (Page.getInitialProps as NonNullable<NextComponentType['getInitialProps']>)(ctx);
    };
  }
  return WithSession;
}
