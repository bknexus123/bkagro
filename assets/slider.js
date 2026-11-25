/* BK Agro photo slideshow: arrows, swipe, autoplay, dots, thumbnails, click-to-enlarge */
(function () {
  function initSlider(root) {
    var track = root.querySelector('.bk-slides');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.bk-slide'));
    if (!track || !slides.length) return;
    var i = 0, timer = null, delay = Number(root.dataset.autoplay || 4500);

    var dots = document.createElement('div');
    dots.className = 'bk-dots';
    slides.forEach(function (_, j) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'ছবি ' + (j + 1));
      b.addEventListener('click', function () { go(j); restart(); });
      dots.appendChild(b);
    });
    root.appendChild(dots);

    var thumbs = root.querySelector('.bk-thumbs');
    if (thumbs) {
      slides.forEach(function (s, j) {
        var img = s.querySelector('img');
        var t = document.createElement('button');
        t.type = 'button';
        t.setAttribute('aria-label', img.alt || ('ছবি ' + (j + 1)));
        t.innerHTML = '<img src="' + img.getAttribute('src') + '" alt="" loading="lazy">';
        t.addEventListener('click', function () { go(j); restart(); });
        thumbs.appendChild(t);
      });
    }

    function go(j) {
      i = (j + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-100 * i) + '%)';
      slides.forEach(function (s, k) { s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('active', k === i); });
      if (thumbs) Array.prototype.forEach.call(thumbs.children, function (d, k) { d.classList.toggle('active', k === i); });
      var cap = root.querySelector('.bk-caption');
      if (cap) cap.textContent = slides[i].querySelector('img').alt || '';
    }
    function next() { go(i + 1); }
    function prev() { go(i - 1); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    function start() { stop(); if (delay > 0 && slides.length > 1) timer = setInterval(next, delay); }
    function restart() { start(); }

    var p = root.querySelector('.bk-prev'), n = root.querySelector('.bk-next');
    if (p) p.addEventListener('click', function () { prev(); restart(); });
    if (n) n.addEventListener('click', function () { next(); restart(); });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { next(); restart(); }
      if (e.key === 'ArrowLeft') { prev(); restart(); }
    });

    // swipe
    var x0 = null, y0 = null, moved = false;
    track.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; moved = false; stop(); }, { passive: true });
    track.addEventListener('touchmove', function (e) {
      if (x0 === null) return;
      if (Math.abs(e.touches[0].clientX - x0) > 10) moved = true;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
      x0 = null; start();
    });

    // soft blurred backdrop so portrait photos fill the frame
    slides.forEach(function (s) {
      var bg = document.createElement('div');
      bg.className = 'bk-blur';
      bg.style.backgroundImage = 'url("' + s.querySelector('img').getAttribute('src') + '")';
      s.insertBefore(bg, s.firstChild);
    });

    // click to enlarge
    slides.forEach(function (s, j) {
      var img = s.querySelector('img');
      img.setAttribute('tabindex', '0');
      img.addEventListener('click', function () { if (!moved) openBox(slides, j); });
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter') openBox(slides, j); });
    });

    go(0);
    start();
  }

  var box, boxImg, boxCap, boxList = [], boxIdx = 0;
  function ensureBox() {
    if (box) return;
    box = document.createElement('div');
    box.className = 'bk-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<button type="button" class="bk-lb-close" aria-label="বন্ধ করুন">×</button>' +
      '<button type="button" class="bk-lb-prev" aria-label="আগের ছবি">‹</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="bk-lb-next" aria-label="পরের ছবি">›</button>';
    document.body.appendChild(box);
    boxImg = box.querySelector('img');
    boxCap = box.querySelector('figcaption');
    box.querySelector('.bk-lb-close').addEventListener('click', closeBox);
    box.querySelector('.bk-lb-prev').addEventListener('click', function () { showBox(boxIdx - 1); });
    box.querySelector('.bk-lb-next').addEventListener('click', function () { showBox(boxIdx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) closeBox(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') closeBox();
      if (e.key === 'ArrowRight') showBox(boxIdx + 1);
      if (e.key === 'ArrowLeft') showBox(boxIdx - 1);
    });
    var sx = null;
    box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) showBox(boxIdx + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }
  function showBox(j) {
    boxIdx = (j + boxList.length) % boxList.length;
    var img = boxList[boxIdx].querySelector('img');
    boxImg.src = img.getAttribute('src');
    boxImg.alt = img.alt || '';
    boxCap.textContent = img.alt || '';
  }
  function openBox(list, j) {
    ensureBox();
    boxList = list;
    showBox(j);
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeBox() {
    box.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.bk-slider'), initSlider);
  });
})();
