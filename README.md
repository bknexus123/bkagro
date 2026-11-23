# BK Agro website (bkagrobd.com)

Static website served by a **Cloudflare Worker** (project name `bkagro`), deployed automatically from the GitHub repo `bknexus123/bkagro`.

## How orders work
1. The customer fills in the checkout form and taps **Submit Order**.
2. The form sends the order to `/api/order` (handled by `worker.js`).
3. The Worker adds the order as a new row in the **BK Agro - Orders** Google Sheet (one tab per month) and emails the full order (customer, delivery address, items, prices, estimated total, notes) to **bkagro2025@gmail.com** using **Cloudflare Email Routing**. No outside service, no API key, no activation emails.
4. The customer sees "Order submitted successfully" with an order reference (for example `BKA-20261210-3A7F14`).

Product names and prices in the email are read from `assets/products.js`, so the email always matches the website.

## One-time requirement
In Cloudflare → bkagrobd.com → **Email → Email Routing → Destination addresses**, `bkagro2025@gmail.com` must show **Verified**.

To change where orders go, edit `ORDER_TO` in `wrangler.jsonc`.

## Files
| What | File |
|---|---|
| Products and prices | `assets/products.js` |
| Contacts and menu | `assets/site.js` |
| Cart, checkout and page logic | `assets/app.js` |
| Division / district / area lists | `assets/locations.js`, `assets/locations-ui.js` |
| Order email (server side) | `worker.js` |
| Cloudflare settings | `wrangler.jsonc` |
| Files hidden from visitors | `.assetsignore` |
| How to Order page | `how-to-order.html` |
| Favicons (white rounded background) | `bk-agro-favicon.png`, `bk-agro-favicon-512.png`, `apple-touch-icon.png` |

## If an order email does not arrive
- Check Gmail Spam and search "New Order BKA".
- Cloudflare → Email Routing → Activity log: look for the order time.
- Cloudflare → Workers & Pages → bkagro → Logs: look for "Order email failed".

## Google Sheet
Set two **Secret** variables on the Worker: `SHEET_URL` (Apps Script web app URL) and `SHEET_TOKEN`. See `Google-Sheet-Setup.md` (kept outside this folder because it contains the token).
