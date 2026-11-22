# BK Agro website
Static HTML/CSS/JS site, ready for Cloudflare Pages. No build step. Upload the contents of this folder.

## Order handling
Checkout prepares a WhatsApp message to +8801342117777. The customer must tap Send in WhatsApp. The site does NOT automatically submit orders or email backups. For guaranteed server-side records, a verified backend/API integration is required.

## Editing
Products: assets/products.js (all prices null). Navigation and contacts: assets/site.js. Page layout: assets/app.js. Photos: images/.

## Notes
Lamb is Coming Soon per latest instruction. Layer eggs currently use the supplied egg photo as a placeholder, and duck meat/eggs use the user's real duck photo, not misleading stock product photos. Replace these with verified real product shots when available. All uploaded images remain genuine photos.

Before deployment, review terms/privacy text, test WhatsApp submission manually, and confirm the live domain. The original source archives remain unchanged.

FONT NOTE: Nexa Pro Trial VF and Kalpurush font binaries are not included. Exact Nexa rendering requires licensed font files.


## Direct order emails (important activation step)
The checkout sends order details directly from the form to `info@bkagrobd.com` via FormSubmit AJAX, with a structured table email. It does not open WhatsApp or the visitor's email client. The owner MUST verify/activate `info@bkagrobd.com` with FormSubmit's initial confirmation email. Until activation, delivery is not assured. For production, use a verified transactional email service and a server-side endpoint for reliable delivery, abuse protection and order records. Test a real checkout on a deployed HTTPS website.
