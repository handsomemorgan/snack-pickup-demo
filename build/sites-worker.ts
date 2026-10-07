import handler from "vinext/server/fetch-handler";

// Local demo: no ChatGPT authentication or external connector service.
export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
};
