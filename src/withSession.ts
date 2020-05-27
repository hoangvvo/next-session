import { ComponentType, createElement } from "react";
import { NextPage, NextPageContext, NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { AppContext } from 'next/app';
import { applySession } from "./core";
import { Request, Options } from "./types";
import { ServerResponse } from "http";

function getDisplayName(WrappedComponent: ComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || "Component";
}

function isNextApiHandler(handler: NextApiHandler | NextPage): handler is NextApiHandler {
  return handler.length > 1;
}

export default function withSession(handler: NextApiHandler | NextPage, options: Options) {
  // API Routes
  if (isNextApiHandler(handler))
    return async function WithSession(req: NextApiRequest, res: NextApiResponse) {
      await applySession(req as Request, res, options);
      return handler(req, res);
    };

  // Pages
  const Page = handler;
  function WithSession(props: NextPage) {
    // @ts-ignore
    return createElement(Page, props);
  }
  WithSession.displayName = `withSession(${getDisplayName(Page)})`;
  if (Page.getInitialProps) {
    WithSession.getInitialProps = async (pageCtx: AppContext | NextPageContext) => {
      const ctx = "Component" in pageCtx ? pageCtx.ctx : pageCtx;
      // @ts-ignore
      if (typeof window === "undefined") {
        const { req, res } = ctx;
        await applySession(req as Request, res as ServerResponse, options);
      }
      // @ts-ignore
      return Page.getInitialProps(ctx);
    };
  }
  return WithSession;
}
