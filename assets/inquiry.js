/* BK Agro: inquiry form for inquiry-only products (e.g. Buffalo Meat).
   Sends to /api/inquiry, which emails BK Agro. Does not touch the cart or orders. */
(function () {
  var WA = '8801342117777';
  var box = null, lastFocus = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function product(id) {
    return (window.PRODUCTS || []).filter(function (p) { return p.id === id; })[0] || { id: id, name: id, bangla: '' };
  }
  function waLink(p) {
    var text = 'আসসালামু আলাইকুম, ' + p.name + (p.bangla ? ' (' + p.bangla + ')' : '') + ' পাওয়া যাবে কি? জানাবেন।';
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text);
  }

  function build() {
    box = document.createElement('div');
    box.className = 'inq-overlay';
    box.innerHTML =
      '<div class="inq-dialog" role="dialog" aria-modal="true" aria-labelledby="inqTitle">' +
      '<button type="button" class="inq-close" aria-label="বন্ধ করুন">×</button>' +
      '<div class="eyebrow">PRODUCT INQUIRY</div>' +
      '<h2 id="inqTitle"></h2><p class="inq-sub" lang="bn"></p>' +
      '<form class="inq-form" novalidate>' +
      '<input type="hidden" name="product">' +
      '<label>Name *<input name="name" autocomplete="name" required maxlength="200"></label>' +
      '<label>Mobile *<input name="mobile" type="tel" inputmode="numeric" placeholder="01XXXXXXXXX" autocomplete="tel" required maxlength="11"></label>' +
      '<label>Email <span class="optional">(optional)</span><input name="email" type="email" autocomplete="email" maxlength="200"></label>' +
      '<label>Quantity wanted <span class="optional">(optional)</span><input name="quantity" placeholder="যেমন: ৫ কেজি" maxlength="100"></label>' +
      '<label>Message <span class="optional">(optional)</span><textarea name="message" rows="3" maxlength="1500"></textarea></label>' +
      '<input class="inq-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="inq-status" role="status" aria-live="polite"></p>' +
      '<div class="inq-actions"><button type="submit" class="btn">Send Inquiry</button>' +
      '<a class="btn outline inq-wa" target="_blank" rel="noopener">Ask on WhatsApp</a></div>' +
      '</form></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    box.querySelector('.inq-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
    box.querySelector('form').addEventListener('submit', submit);
  }

  function open(id) {
    if (!box) build();
    var p = product(id), f = box.querySelector('form');
    lastFocus = document.activeElement;
    box.querySelector('#inqTitle').textContent = p.name + ' Inquiry';
    box.querySelector('.inq-sub').innerHTML = esc(p.bangla) + (p.price ? ' · ৳ ' + Number(p.price).toLocaleString('en-BD') + ' / ' + esc(p.unit || 'kg') : '') +
      '<br>পাওয়া যাবে কিনা জানতে নিচের ফর্মটি পাঠান। আমরা যোগাযোগ করে জানিয়ে দেব।';
    f.product.value = p.id;
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('bk_customer') || '{}'); } catch (e) {}
    if (!f.name.value && saved.name) f.name.value = saved.name;
    if (!f.mobile.value && saved.mobile) f.mobile.value = saved.mobile;
    if (!f.email.value && saved.email) f.email.value = saved.email;
    box.querySelector('.inq-wa').href = waLink(p);
    var st = box.querySelector('.inq-status'); st.textContent = ''; st.className = 'inq-status';
    f.hidden = false;
    var done = box.querySelector('.inq-done'); if (done) done.remove();
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { f.name.focus(); }, 30);
  }
  function close() {
    box.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function submit(e) {
    e.preventDefault();
    var f = e.target, st = box.querySelector('.inq-status'), btn = f.querySelector('button[type=submit]');
    var d = {
      product: f.product.value, name: f.name.value.trim(), mobile: f.mobile.value.replace(/\D/g, ''),
      email: f.email.value.trim(), quantity: f.quantity.value.trim(), message: f.message.value.trim(), website: f.website.value
    };
    if (!d.name) { st.textContent = 'Please enter your name.'; st.className = 'inq-status err'; f.name.focus(); return; }
    if (!/^01\d{9}$/.test(d.mobile)) { st.textContent = 'Please enter a valid 11-digit mobile number (01XXXXXXXXX).'; st.className = 'inq-status err'; f.mobile.focus(); return; }
    btn.disabled = true; btn.textContent = 'Sending…'; st.textContent = ''; st.className = 'inq-status';
    fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
      .then(function (res) {
        if (!res.success) throw new Error(res.error || '');
        f.hidden = true;
        var done = document.createElement('div');
        done.className = 'inq-done';
        done.innerHTML = '<div class="inq-tick">✓</div><h3>Inquiry sent</h3><p lang="bn">ধন্যবাদ! আপনার Inquiry আমরা পেয়েছি। শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>' +
          '<p class="small">Reference: ' + esc(res.inquiryId || '') + '</p><button type="button" class="btn outline">Close</button>';
        done.querySelector('button').addEventListener('click', close);
        f.parentNode.appendChild(done); box.querySelector('.inq-dialog').scrollTop = 0;
        f.message.value = ''; f.quantity.value = '';
      })
      .catch(function (err) {
        st.innerHTML = esc(err && err.message ? err.message : 'We could not send your inquiry right now.') +
          ' <a href="' + waLink(product(d.product)) + '" target="_blank" rel="noopener">Ask on WhatsApp →</a>';
        st.className = 'inq-status err';
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Send Inquiry'; });
  }

  window.openInquiry = open;
})();
