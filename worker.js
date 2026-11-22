// BK Agro Worker: serves the website files, and runs the order form at /api/order.
import { onRequestPost, onRequestGet } from "./functions/api/order.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/order" || url.pathname === "/api/order/") {
      if (request.method === "POST") return onRequestPost({ request, env, ctx });
      return onRequestGet();
    }
    return env.ASSETS.fetch(request);
  }
};
