# BK Agro direct order form to email

Destination: info@bkagrobd.com. WhatsApp checkout is not used.

The checkout submits customer name, mobile, email, delivery address, order items, quantities, estimated amount, and notes as a formatted HTML email via `/api/order`. This API is a Cloudflare Pages Function, and uses Resend to send the email. A standalone HTML preview or static-only host cannot deliver emails.

## Required deployment
1. Deploy this folder to **Cloudflare Pages**, keeping `functions/api/order.js` in the deployed project root.
2. In Resend, verify the sending domain `bkagrobd.com` by adding the DNS records shown by Resend.
3. Set Cloudflare Pages secret `RESEND_API_KEY` to your Resend API key. Set `ORDER_FROM_EMAIL` to an approved sender, for example `BK Agro Orders <orders@bkagrobd.com>`. Do not put API keys in HTML or JavaScript sent to browsers.
4. Redeploy the site and place a real test order on the live HTTPS URL. Check the `info@bkagrobd.com` inbox, spam folder, and Resend delivery logs.
5. If an email is not delivered, inspect the browser Network response for `/api/order`, Cloudflare Pages Function logs, and Resend sending logs. Verify MX records and inbox operation separately.

## Important
The frontend only reports successful submission when the email provider accepts the message. Provider acceptance is not proof of inbox delivery. Test end-to-end delivery before accepting real customer orders. Add rate limiting, spam protection, order persistence and monitoring before production use.
