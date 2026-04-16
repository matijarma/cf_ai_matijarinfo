import llmShellWorker from "./worker.js";
export { LlmRateLimiter } from "./rate-limiter.js";

function isWorkerRoute(pathname) {
  return pathname === "/worker" || pathname.startsWith("/worker/");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (isWorkerRoute(url.pathname)) {
      return llmShellWorker.fetch(request, env, ctx);
    }

    if (env?.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Static assets binding is not configured.", {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=UTF-8",
      },
    });
  },
};
