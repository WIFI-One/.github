import './styles.css';

/* WIFI One homepage boot splash — the same ParticleSlider animation the
   apps use (wifi-chat's LoadingScreen / wifi-board & wifi-meet boot), reading
   "WiFi One". Runs the real engine (this folder's ps-0.9.js, vendored so it
   stays offline), same responsive config (ptlGap/ptlSize), monochrome white,
   no dat.GUI, no input handlers. Shows on the first visit only (tracked via
   localStorage['wifione:bootSeen']), then fades into the homepage, stops the
   engine and removes itself. Fixed show from engine start: ~3.2s formation +
   2s hold = 5.2s. */
(function () {
  'use strict';
  var boot = document.getElementById('boot');
  if (!boot) return;

  // First-visit only. The inline <head> script hides #boot early when seen.
  var SEEN_KEY = 'wifione:bootSeen';
  var seen = false;
  try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) {}
  if (seen) { boot.remove(); return; }
  try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finished = false, ps = null;

  function finish() {
    if (finished) return;
    finished = true;
    boot.classList.add('done');
    setTimeout(function () {
      try { if (ps) ps.nextFrame = function () {}; } catch (e) {}
      boot.remove();
    }, 650);
  }

  function timeout(p, ms) {
    return Promise.race([p, new Promise(function (res) { setTimeout(res, ms); })]);
  }

  // No engine / reduced motion: skip the splash entirely, show the page.
  if (reduced || typeof ParticleSlider === 'undefined') { boot.remove(); return; }

  // Runtime slide image (data URL) for the engine to sample — same 1200x500
  // shrink-to-fit recipe as the apps, with the WIFI One title.
  function makeSlideDataUrl() {
    var c = document.createElement('canvas');
    c.width = 1200;
    c.height = 500;
    var g = c.getContext('2d');
    if (!g) return '';
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    var px = 170;
    g.font = '700 ' + px + 'px "Space Grotesk", system-ui, sans-serif';
    var measured = g.measureText('WiFi One').width;
    if (measured > c.width * 0.92) {
      px = Math.floor(px * c.width * 0.92 / measured);
      g.font = '700 ' + px + 'px "Space Grotesk", system-ui, sans-serif';
    }
    g.fillText('WiFi One', c.width / 2, c.height / 2);
    return c.toDataURL('image/png');
  }

  var fonts = (document.fonts && document.fonts.ready) ? timeout(document.fonts.ready, 2500) : Promise.resolve();
  var FORMATION_MS = 3200, HOLD_MS = 2000;

  timeout(fonts, 1200).then(function () {
    if (finished) return;
    try {
      var slideUrl = makeSlideDataUrl();
      if (!slideUrl) { finish(); return; }
      document.getElementById('first-slide').setAttribute('data-src', slideUrl);
      // Same responsive config as the apps' boot splashes.
      var ua = (navigator.userAgent || '').toLowerCase();
      var isMobile = ua.indexOf('mobile') >= 0;
      var isSmall = window.innerWidth < 1000;
      ps = new ParticleSlider({
        ptlGap: isMobile || isSmall ? 3 : 0,
        ptlSize: isMobile || isSmall ? 3 : 1,
        width: 1e9,
        height: 1e9,
      });
      ps.monochrome = true;
      if (ps.setColor) ps.setColor('#ffffff');
      ps.restless = true;
      // The engine samples the slide synchronously in init(), so wait for the
      // image to decode before starting; otherwise it forms from nothing.
      var img = new Image();
      img.onload = function () {
        if (finished) return;
        try { ps.init(true); } catch (e) { finish(); return; }
        setTimeout(function () {
          if (finished) return;
          fonts.then(function () { setTimeout(finish, HOLD_MS); });
        }, FORMATION_MS);
      };
      img.onerror = function () { finish(); };
      img.src = slideUrl;
    } catch (e) { finish(); }
  });
})();

/* Homepage niceties: current year + scroll reveals. */
(function () {
  'use strict';
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });
})();

/* Interactive dotted backdrop: a full-field grid of small dots that softly
   pulse and swell as the pointer moves over them, then settle back down.
   Purely decorative — pointer-events are off, and reduced-motion users get a
   calm, non-animated grid. */
(function () {
  'use strict';
  var el = document.querySelector('.bg-grid');
  if (!el || !el.getContext) return;
  var ctx = el.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GAP = 28;          // spacing between dots
  var BASE = 1.3;        // resting dot radius
  var GROW = 4.2;        // extra radius at the pointer centre
  var RANGE = 200;       // pointer influence radius
  var RANGE2 = RANGE * RANGE;
  var dpr = 1, w = 0, h = 0;
  var mx = -1e5, my = -1e5, tmx = -1e5, tmy = -1e5;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    el.width = Math.floor(w * dpr);
    el.height = Math.floor(h * dpr);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(performance.now());
  }

  function paint(now) {
    ctx.clearRect(0, 0, w, h);
    var t = now * 0.0016;
    for (var x = GAP / 2; x < w; x += GAP) {
      for (var y = GAP / 2; y < h; y += GAP) {
        var dx = x - mx, dy = y - my;
        var d2 = dx * dx + dy * dy;
        var infl = 0;
        if (d2 < RANGE2) {
          var f = 1 - Math.sqrt(d2) / RANGE;
          infl = f * f;
        }
        var pulse = reduce ? 0 : (0.5 + 0.5 * Math.sin(t * 2 + (x + y) * 0.025));
        var r = BASE + infl * GROW + infl * pulse * 1.6;
        var a = 0.24 + infl * 0.62 + (reduce ? 0 : pulse * 0.08);
        ctx.beginPath();
        ctx.arc(x, y, r < 0.3 ? 0.3 : r, 0, 6.283185);
        ctx.fillStyle = 'rgba(255,255,255,' + (a > 1 ? 1 : a).toFixed(3) + ')';
        ctx.fill();
      }
    }
  }

  function frame(now) {
    // Ease the pointer influence toward its target for a soft, trailing swell.
    mx += (tmx - mx) * 0.16;
    my += (tmy - my) * 0.16;
    paint(now);
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (reduce) return; // static grid for reduced-motion users

  window.addEventListener('mousemove', function (e) {
    tmx = e.clientX; tmy = e.clientY;
  }, { passive: true });
  window.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget) { tmx = -1e5; tmy = -1e5; }
  }, { passive: true });
  requestAnimationFrame(frame);
})();
