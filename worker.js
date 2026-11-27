// BK Agro Worker
// - Serves the website files
// - POST /api/order: emails every order to BK Agro through Cloudflare Email Routing,
//   and adds it as a row in the BK Agro Orders Google Sheet (SHEET_URL + SHEET_TOKEN secrets)
//   (no outside service, no API key, no activation emails)
// Product names and prices are read live from assets/products.js, so the email
// always matches the website after you change a price.
import { EmailMessage } from "cloudflare:email";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const taka = n => "৳" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
const oneLine = v => String(v ?? "").replace(/[\r\n]+/g, " ").trim();
const WA = "+880 1342-117777";

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n");
}

async function loadCatalog(request, env) {
  const res = await env.ASSETS.fetch(new Request(new URL("/assets/products.js", request.url)));
  const text = await res.text();
  const start = text.indexOf("["), end = text.lastIndexOf("]");
  const list = JSON.parse(text.slice(start, end + 1));
  return Object.fromEntries(list.map(p => [p.id, p]));
}

async function handleOrder(request, env) {
  if (request.method !== "POST") return json({ success: false, error: "Please use the checkout form." }, 405);
  if (!env.ORDER_EMAIL || !env.ORDER_TO) return json({ success: false, error: `Online ordering is not ready yet. Please order on WhatsApp: ${WA}.` }, 503);

  let data;
  try { data = await request.json(); } catch { return json({ success: false, error: "Invalid order form." }, 400); }
  const c = data?.customer || {}, items = data?.items;
  if (c.areaCustom && (!c.area || /^Other/.test(c.area))) c.area = c.areaCustom;
  for (const k of ["area", "city", "division", "postcode", "landmark", "deliveryDate", "email", "special"]) if (typeof c[k] !== "string") c[k] = "";

  for (const k of ["name", "mobile", "address"]) {
    if (typeof c[k] !== "string" || !c[k].trim() || c[k].length > 400) return json({ success: false, error: "Please fill in all required fields." }, 400);
  }
  if (!/^01\d{9}$/.test(c.mobile)) return json({ success: false, error: "Please enter a valid 11-digit mobile number." }, 400);
  if (!Array.isArray(items) || !items.length || items.length > 40) return json({ success: false, error: "Your cart is empty." }, 400);

  let catalog;
  try { catalog = await loadCatalog(request, env); }
  catch (e) { console.error("Catalog load failed", e && e.message); return json({ success: false, error: `We could not read the product list. Please order on WhatsApp: ${WA}.` }, 500); }

  let total = 0, rows = "";
  const itemLines = [];
  for (const it of items) {
    const p = catalog[it.id], q = Number(it.quantity);
    if (!p || p.coming || p.inquiry || !Number.isFinite(q) || q <= 0 || q > 200) return json({ success: false, error: "An item in your cart is no longer available. Please refresh the page and try again." }, 400);
    const price = Number(p.price) || 0, line = price * q;
    total += line;
    itemLines.push(`${p.name} — ${p.unit === "box" ? `${q} box${q > 1 ? "es" : ""}${p.eggs ? ` (${p.eggs * q} eggs)` : ""}` : `${q} ${p.unit || ""}`.trim()}${price ? " — " + taka(line) : ""}`);
    const qty = p.unit === "box" ? `${q} box${q > 1 ? "es" : ""}${p.eggs ? ` (${p.eggs * q} eggs)` : ""}` : `${q} ${p.unit || ""}`.trim();
    rows += `<tr><td style="padding:8px;border-bottom:1px solid #eee">${esc(p.name)}${p.bangla ? `<br><span style="color:#666">${esc(p.bangla)}</span>` : ""}</td>` +
      `<td style="padding:8px;border-bottom:1px solid #eee">${esc(qty)}</td>` +
      `<td style="padding:8px;border-bottom:1px solid #eee">${price ? taka(price) + " / " + esc(p.unit) : "—"}</td>` +
      `<td style="padding:8px;border-bottom:1px solid #eee">${price ? taka(line) : "—"}</td></tr>`;
  }

  const now = new Date();
  const stamp = new Date(now.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const orderId = "BKA-" + stamp.slice(0, 10).replaceAll("-", "") + "-" + crypto.randomUUID().slice(0, 6).toUpperCase();
  const spam = c.website ? "Hidden anti-spam field was filled (can be browser autofill). Please check before processing." : "";
  const cell = (k, v) => `<tr><th style="text-align:left;padding:8px;background:#f5f7f1;width:34%">${esc(k)}</th><td style="padding:8px">${esc(v || "—")}</td></tr>`;

  const html = `<div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;color:#173e2b">
<h2 style="background:#173e2b;color:#fff;padding:18px;margin:0">BK Agro · New Order</h2>
<p><b>Order:</b> ${orderId}<br><b>Received:</b> ${stamp} (Dhaka time)</p>
<h3>Customer</h3><table style="border-collapse:collapse;width:100%">
${cell("Name", c.name)}${cell("Mobile", c.mobile)}${cell("Email", c.email)}</table>
<h3>Delivery</h3><table style="border-collapse:collapse;width:100%">
${cell("House / Flat / Road", c.address)}${cell("Area / Upazila", c.area)}${cell("District", c.city)}${cell("Division", c.division)}${cell("Post Code", c.postcode)}${cell("Landmark", c.landmark)}${cell("Preferred delivery day", c.deliveryDate)}${cell("Order notes", c.special)}${spam ? cell("Note", spam) : ""}</table>
<h3>Items</h3><table style="border-collapse:collapse;width:100%"><tr style="background:#f5f7f1"><th align="left" style="padding:8px">Product</th><th align="left" style="padding:8px">Quantity</th><th align="left" style="padding:8px">Price</th><th align="left" style="padding:8px">Amount</th></tr>${rows}</table>
<h3>Estimated total: ${taka(total)}</h3>
<p style="color:#666">Meat is billed on actual weight, so the final amount may change slightly. Delivery charge (if any) is not included.</p>
<p><a href="tel:${esc(c.mobile)}">📞 Call customer</a> &nbsp;·&nbsp; <a href="https://wa.me/88${esc(c.mobile)}">💬 WhatsApp customer</a></p></div>`;

  const from = env.ORDER_FROM || "orders@bkagrobd.com", to = env.ORDER_TO;
  const subject = `New Order ${orderId} — ${oneLine(c.name)} — ${taka(total)}`;
  const replyTo = c.email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(c.email) ? `Reply-To: <${oneLine(c.email)}>` : null;
  const raw = [
    `From: BK Agro Orders <${from}>`, `To: <${to}>`, replyTo,
    `Subject: =?UTF-8?B?${b64(subject).replace(/\r\n/g, "")}?=`,
    `Date: ${now.toUTCString()}`, `Message-ID: <${crypto.randomUUID()}@bkagrobd.com>`,
    "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(html)
  ].filter(l => l !== null).join("\r\n");

  // 1) Email to BK Agro   2) Row in the Google Sheet. The order counts as received if either works.
  const emailJob = env.ORDER_EMAIL.send(new EmailMessage(from, to, raw))
    .then(() => true, err => { console.error("Order email failed:", err && err.message); return false; });

  const sheetJob = (env.SHEET_URL && env.SHEET_TOKEN)
    ? fetch(env.SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "follow",
        body: JSON.stringify({
          token: env.SHEET_TOKEN, orderId,
          name: c.name, mobile: c.mobile, email: c.email || "",
          address: c.address, area: c.area || "", district: c.city || "", division: c.division || "",
          postcode: c.postcode || "", landmark: c.landmark || "", deliveryDay: c.deliveryDate || "",
          items: itemLines.join("\n"), total,
          notes: [c.special, spam].filter(Boolean).join(" | ")
        })
      }).then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!body.ok) console.error("Order sheet failed:", r.status, body.error || "");
        return !!body.ok;
      }, err => { console.error("Order sheet failed:", err && err.message); return false; })
    : Promise.resolve(false);

  const [emailOk, sheetOk] = await Promise.all([emailJob, sheetJob]);
  if (!emailOk && !sheetOk) {
    return json({ success: false, error: `We could not send your order right now. Please order on WhatsApp: ${WA}.` }, 502);
  }
  return json({ success: true, orderId });
}

// POST /api/inquiry: availability questions for inquiry-only products (e.g. Buffalo Meat).
// Email only; it does not touch orders or the Google Sheet.
async function handleInquiry(request, env) {
  if (request.method !== "POST") return json({ success: false, error: "Please use the inquiry form." }, 405);
  if (!env.ORDER_EMAIL || !env.ORDER_TO) return json({ success: false, error: `Please message us on WhatsApp: ${WA}.` }, 503);
  let d;
  try { d = await request.json(); } catch { return json({ success: false, error: "Invalid inquiry form." }, 400); }
  for (const k of ["product", "name", "mobile", "quantity", "message", "email", "website"]) if (typeof d?.[k] !== "string") d[k] = "";
  if (!d.name.trim() || d.name.length > 200) return json({ success: false, error: "Please enter your name." }, 400);
  if (!/^01\d{9}$/.test(d.mobile)) return json({ success: false, error: "Please enter a valid 11-digit mobile number." }, 400);
  if (d.quantity.length > 100 || d.message.length > 1500 || d.email.length > 200) return json({ success: false, error: "Your message is too long." }, 400);

  let p = null;
  try { p = (await loadCatalog(request, env))[d.product] || null; } catch (e) { console.error("Catalog load failed", e && e.message); }
  const productName = p ? `${p.name}${p.bangla ? " (" + p.bangla + ")" : ""}` : (d.product || "Product");

  const now = new Date();
  const stamp = new Date(now.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const inquiryId = "BKQ-" + stamp.slice(0, 10).replaceAll("-", "") + "-" + crypto.randomUUID().slice(0, 6).toUpperCase();
  const cell = (k, v) => `<tr><th style="text-align:left;padding:8px;background:#f5f7f1;width:34%">${esc(k)}</th><td style="padding:8px">${esc(v || "—")}</td></tr>`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;color:#173e2b">
<h2 style="background:#8a6d1f;color:#fff;padding:18px;margin:0">BK Agro · Product Inquiry</h2>
<p><b>Inquiry:</b> ${inquiryId}<br><b>Received:</b> ${stamp} (Dhaka time)</p>
<table style="border-collapse:collapse;width:100%">
${cell("Product", productName)}${p && p.price ? cell("Listed price", taka(p.price) + " / " + (p.unit || "kg")) : ""}${cell("Name", d.name)}${cell("Mobile", d.mobile)}${cell("Email", d.email)}${cell("Quantity wanted", d.quantity)}${cell("Message", d.message)}${d.website ? cell("Note", "Hidden anti-spam field was filled (can be browser autofill).") : ""}</table>
<p>This is an inquiry, not an order. Please reply to confirm availability.</p>
<p><a href="tel:${esc(d.mobile)}">📞 Call customer</a> &nbsp;·&nbsp; <a href="https://wa.me/88${esc(d.mobile)}">💬 WhatsApp customer</a></p></div>`;
  const from = env.ORDER_FROM || "orders@bkagrobd.com", to = env.ORDER_TO;
  const subject = `Inquiry ${inquiryId} — ${oneLine(p ? p.name : d.product)} — ${oneLine(d.name)}`;
  const replyTo = d.email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(d.email) ? `Reply-To: <${oneLine(d.email)}>` : null;
  const raw = [
    `From: BK Agro Orders <${from}>`, `To: <${to}>`, replyTo,
    `Subject: =?UTF-8?B?${b64(subject).replace(/\r\n/g, "")}?=`,
    `Date: ${now.toUTCString()}`, `Message-ID: <${crypto.randomUUID()}@bkagrobd.com>`,
    "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(html)
  ].filter(l => l !== null).join("\r\n");
  try { await env.ORDER_EMAIL.send(new EmailMessage(from, to, raw)); }
  catch (err) { console.error("Inquiry email failed:", err && err.message); return json({ success: false, error: `We could not send your inquiry. Please message us on WhatsApp: ${WA}.` }, 502); }
  return json({ success: true, inquiryId });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/order" || path === "/api/order/") return handleOrder(request, env);
    if (path === "/api/inquiry" || path === "/api/inquiry/") return handleInquiry(request, env);
    return env.ASSETS.fetch(request);
  }
};
