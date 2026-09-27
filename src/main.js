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
