# BK Agro — Cloudflare Pages order form (IMPORTANT)

## What is implemented

The checkout submits a JSON order to **POST /api/order** on your own Cloudflare Pages domain. The Pages Function validates customer name, mobile, address, area, city, cart products and quantities, calculates prices server-side, and calls the Resend email API. It sends a formatted order email to **info@bkagrobd.com**, including customer phone number, full delivery address, order lines, prices, notes and order reference. A customer email, if provided, is used as Reply-To. The circular WhatsApp floating button is preserved.

## Required steps before live emails can work

1. Create or open a **Resend** account (resend.com), add and verify `bkagrobd.com` as a sending domain. Add Resend's requested DNS records (SPF/DKIM) in your DNS provider. Do not replace the MX records used to **receive** email at `info@bkagrobd.com`.
2. Create a Resend API key with sending permission. Do not share this key publicly or place it in HTML, JavaScript or chat.
3. In **Cloudflare Dashboard → Workers & Pages → your BK Agro Pages project → Settings → Variables and Secrets**, add:
   - `RESEND_API_KEY` as an **encrypted secret** (value = the API key)
   - `ORDER_FROM_EMAIL` as a **plain-text variable** (value = `BK Agro Orders <orders@bkagrobd.com>`, or another verified sender address)
   Configure production environment; configure preview environment too if you need email tests there.
4. Deploy **the entire folder contents**, including `functions/api/order.js`, to your existing Cloudflare Pages project. For a Git-connected Pages project, commit/push the `functions/` directory and redeploy. If you use Direct Upload, verify the deployment method actually supports deploying Pages Functions; static HTML upload alone is not enough. The `functions/` folder must be at the Pages project root.
5. Check that `https://bkagrobd.com/api/order` returns a JSON error with HTTP **405** on GET. If you see HTML or 404, the Pages Function was not deployed.
6. Place a small **real test order** from the live website. Confirm success message with order reference, email arrival at `info@bkagrobd.com`, and Resend delivery log. Check Spam/Junk. Test with invalid phone and with missing server secret (must show error, not fake success).

## Troubleshooting

- `503 Order email service has not been configured`: set `RESEND_API_KEY` and redeploy.
- `502 Email provider rejected the order`: verify sender domain, sender email, API key, and Resend sending limits. Check Cloudflare Pages Function logs and Resend email logs.
- `404` or HTML response from `/api/order`: Pages Function missing or static-only deployment.
- Email accepted but missing from inbox: check Resend status, DNS/MX and spam filtering; acceptance does **not** guarantee inbox delivery.
- Local `.html` preview: cannot send live emails. Use Cloudflare Pages deployment to test.

**Security:** Never publish an API key. For production, add Cloudflare Turnstile or WAF rate limits to mitigate automated spam. If you need guaranteed order retention even when email fails, add D1 order storage and monitoring; this version does not claim to persist orders independently of the email provider.
