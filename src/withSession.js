import React from "react";
import { applySession } from "./core";

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || "Component";
}

export default function withSession(handler, options) {
  // API Routes
  if (handler.length > 1)
    return async function WithSession(req, res) {
      await applySession(req, res, options);
      return handler(req, res);
    };

  // Pages
  const Page = handler;
  function WithSession(props) {
    return React.createElement(Page, props);
  }
  WithSession.displayName = `withSession(${getDisplayName(Page)})`;
  if (Page.getInitialProps) {
    WithSession.getInitialProps = async pageCtx => {
      const ctx = "Component" in pageCtx ? pageCtx.ctx : pageCtx;
      if (typeof window === "undefined") {
        const { req, res } = ctx;
        await applySession(req, res, options);
      }
      return Page.getInitialProps(ctx);
    };
  }
  return WithSession;
}
