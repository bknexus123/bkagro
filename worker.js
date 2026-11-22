// BK Agro Worker
// - Serves the website files
// - /api/order: emails every order to BK Agro using Cloudflare Email Routing (no outside service, no activation)
import { EmailMessage } from "cloudflare:email";

const CATALOG = {
  "layer-eggs": { name: "Layer Eggs", price: 450, unit: "box", eggs: 30 },
  "pakistani-eggs": { name: "Pakistani Chicken Eggs", price: 500, unit: "box", eggs: 30 },
  "deshi-eggs": { name: "Deshi Chicken Eggs", price: 625, unit: "box", eggs: 30 },
  "duck-eggs": { name: "Duck Eggs", price: 500, unit: "box", eggs: 24 },
  "deshi-skin": { name: "Deshi Chicken & Rooster — With Skin", price: 1000, unit: "kg" },
  "deshi-skinless": { name: "Deshi Chicken & Rooster — Without Skin", price: 1050, unit: "kg" },
  "pakistani-skin": { name: "Pakistani Chicken & Rooster — With Skin", price: 900, unit: "kg" },
  "pakistani-skinless": { name: "Pakistani Chicken & Rooster — Without Skin", price: 950, unit: "kg" },
  "pati-hash": { name: "Pati Hash (Duck)", price: 950, unit: "kg" },
  "raj-hash": { name: "Raj Hash (Goose)", price: 1000, unit: "kg" },
  "beef": { name: "Grass-Fed Beef", price: 900, unit: "kg" },
  "buffalo": { name: "Buffalo Meat", price: 1000, unit: "kg" }
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const taka = n => "৳" + Number(n).toLocaleString("en-US");
const clean = v => String(v ?? "").replace(/[\r\n]+/g, " ").trim();

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n");
}

async function handleOrder(request, env) {
  if (request.method !== "POST") return json({ success: false, error: "Please use the checkout form." }, 405);
  if (!env.ORDER_EMAIL) return json({ success: false, error: "Order email is not set up yet. Please order on WhatsApp: +880 1342-117777." }, 503);

  let data;
  try { data = await request.json(); } catch { return json({ success: false, error: "Invalid order form." }, 400); }
  const c = data?.customer || {}, items = data?.items;
  if (c.website) return json({ success: true, orderId: "BKA-REVIEW" }); // spam trap
  for (const k of ["name", "mobile", "address", "area", "city"]) {
    if (typeof c[k] !== "string" || !c[k].trim() || c[k].length > 400) return json({ success: false, error: "Please fill in all required fields." }, 400);
  }
  if (!/^01\d{9}$/.test(c.mobile)) return json({ success: false, error: "Please enter a valid 11-digit mobile number." }, 400);
  if (!Array.isArray(items) || !items.length || items.length > 30) return json({ success: false, error: "Your cart is empty." }, 400);

  let total = 0, rows = "", textLines = [];
  for (const it of items) {
    const p = CATALOG[it.id], q = it.quantity;
    if (!p || !Number.isInteger(q) || q < 1 || q > 100) return json({ success: false, error: "Invalid item in cart. Please refresh and try again." }, 400);
    const line = p.price * q; total += line;
    const qty = q + " " + p.unit + (p.eggs ? ` (${p.eggs * q} eggs)` : "");
    rows += `<tr><td style="padding:8px;border-bottom:1px solid #eee">${esc(p.name)}</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(qty)}</td><td style="padding:8px;border-bottom:1px solid #eee">${taka(line)}</td></tr>`;
    textLines.push(`${p.name} — ${qty} — ${taka(line)}`);
  }

  const now = new Date();
  const dhaka = new Date(now.getTime() + 6 * 3600 * 1000);
  const stamp = dhaka.toISOString().slice(0, 16).replace("T", " ");
  const orderId = "BKA-" + stamp.slice(0, 10).replaceAll("-", "") + "-" + crypto.randomUUID().slice(0, 6).toUpperCase();
  const cell = (k, v) => `<tr><th style="text-align:left;padding:8px;background:#f5f7f1;width:35%">${esc(k)}</th><td style="padding:8px">${esc(v || "—")}</td></tr>`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#173e2b">
<h2 style="background:#173e2b;color:#fff;padding:18px;margin:0">BK Agro · New Order</h2>
<p><b>Order:</b> ${orderId}<br><b>Received:</b> ${stamp} (Dhaka)</p>
<h3>Customer &amp; Delivery</h3><table style="border-collapse:collapse;width:100%">
${cell("Name", c.name)}${cell("Mobile", c.mobile)}${cell("Email", c.email)}${cell("House / Flat / Road", c.address)}${cell("Area", c.area)}${cell("City / District", c.city)}${cell("Landmark", c.landmark)}${cell("Order notes", c.special)}</table>
<h3>Items</h3><table style="border-collapse:collapse;width:100%"><tr><th align="left">Product</th><th align="left">Quantity</th><th align="left">Amount</th></tr>${rows}</table>
<h3>Estimated total: ${taka(total)}</h3><p style="color:#666">Meat is billed on actual weight. Final amount may change slightly.</p>
<p><a href="tel:${esc(c.mobile)}">Call customer</a> · <a href="https://wa.me/88${esc(c.mobile)}">WhatsApp customer</a></p></div>`;

  const from = env.ORDER_FROM || "orders@bkagrobd.com";
  const to = env.ORDER_TO;
  const subject = `New Order ${orderId} — ${clean(c.name)} — ${taka(total)}`;
  const raw = [
    `From: BK Agro Orders <${from}>`,
    `To: <${to}>`,
    c.email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(c.email) ? `Reply-To: <${clean(c.email)}>` : null,
    `Subject: =?UTF-8?B?${b64(subject).replace(/\r\n/g, "")}?=`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@bkagrobd.com>`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(html)
  ].filter(l => l !== null).join("\r\n");

  try {
    await env.ORDER_EMAIL.send(new EmailMessage(from, to, raw));
  } catch (err) {
    console.error("Order email failed:", err && err.message);
    return json({ success: false, error: "We could not send your order right now. Please order on WhatsApp: +880 1342-117777." }, 502);
  }
  return json({ success: true, orderId });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/order" || url.pathname === "/api/order/") return handleOrder(request, env);
    return env.ASSETS.fetch(request);
  }
};
