/* ==========================================================================
   Nihonggo Club — mode ujian (proctor)
   Layar penuh wajib, konten diblur saat tidak fokus, salin/cetak diblokir,
   pindah tab dicatat sebagai pelanggaran.

   Catatan jujur: semua ini berjalan di browser peserta, jadi sifatnya
   pencegah — bukan pengaman. Orang yang paham DevTools tetap bisa melewatinya,
   dan tangkapan layar lewat aplikasi OS (Win+Shift+S, tombol HP) tidak bisa
   dicegah dari halaman web mana pun.
   ========================================================================== */
(function (global) {
  'use strict';

  var NC = global.NC || (global.NC = {});

  // Anti-Extension Injection (MutationObserver)
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return; // Node.ELEMENT_NODE
        var tag = node.tagName.toLowerCase();
        var isScript = tag === 'script' && node.src && node.src.indexOf(window.location.origin) !== 0 && node.src.indexOf('js/') === -1;
        if (isScript || tag === 'iframe' || tag.indexOf('-') !== -1) {
          if (node.parentNode) {
            node.parentNode.removeChild(node);
            console.warn('[Proctor] Removed unauthorized injected node: ' + tag);
          }
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  var LABELS = {
    fullscreen: 'Keluar dari layar penuh',
    tab: 'Pindah tab atau jendela',
    copy: 'Percobaan menyalin teks',
    capture: 'Percobaan tangkapan layar / cetak',
    devtools: 'Penggunaan alat pengembang (DevTools)'
  };

  var BLOCKED_KEYS = ['c', 'x', 'a', 's', 'p', 'u', 'v'];

  var devToolsTrap1;
  var devToolsTrap2;

  function isEditable(el) {
    if (!el || !el.tagName) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  }

  function createProctor(config) {
    config = config || {};

    var target = config.target || document.documentElement;
    var enforce = config.enforce !== false;
    var counts = { fullscreen: 0, tab: 0, copy: 0, capture: 0 };
    var listeners = [];
    var running = false;
    var paused = false;
    var reason = null;

    var supported = !!(target.requestFullscreen || target.webkitRequestFullscreen);

    /* --- util ----------------------------------------------------------- */
    function on(el, type, fn, opts) {
      el.addEventListener(type, fn, opts);
      listeners.push([el, type, fn, opts]);
    }

    function offAll() {
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      listeners = [];
    }

    function emit() {
      if (config.onState) {
        config.onState({ running: running, paused: paused, reason: reason, counts: counts });
      }
    }

    function triggerDevToolsViolation() {
      if (!running || paused) return;
      violation('devtools');
      pause('devtools');
    }

    function violation(type) {
      if (!running) return;
      counts[type] = (counts[type] || 0) + 1;
      if (config.onViolation) config.onViolation(type, counts[type]);
      emit();
    }

    /* --- layar penuh ---------------------------------------------------- */
    function isFullscreen() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }

    function requestFullscreen() {
      var fn = target.requestFullscreen || target.webkitRequestFullscreen;
      if (!fn) return Promise.reject(new Error('Layar penuh tidak didukung browser ini.'));
      try {
        var res = fn.call(target, { navigationUI: 'hide' });
        return res && res.then ? res : Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }

    function exitFullscreen() {
      if (!isFullscreen()) return Promise.resolve();
      var fn = document.exitFullscreen || document.webkitExitFullscreen;
      if (!fn) return Promise.resolve();
      try {
        var res = fn.call(document);
        return res && res.then ? res.catch(function () {}) : Promise.resolve();
      } catch (err) {
        return Promise.resolve();
      }
    }

    /* --- jeda / lanjut -------------------------------------------------- */
    function pause(why) {
      if (!running || paused) return;
      paused = true;
      reason = why;
      document.body.classList.add('exam-paused');
      emit();
    }

    function resume() {
      if (!running) return Promise.resolve();
      var step = enforce && supported && !isFullscreen() ? requestFullscreen() : Promise.resolve();
      return step.then(function () {
        paused = false;
        reason = null;
        document.body.classList.remove('exam-paused');
        emit();
      });
    }

    /* --- penjaga -------------------------------------------------------- */
    function guard(e) {
      e.preventDefault();
      return false;
    }

    function install() {
      on(document, 'contextmenu', guard);
      on(document, 'dragstart', guard);

      on(document, 'selectstart', function (e) {
        if (isEditable(e.target)) return;
        e.preventDefault();
      });

      ['copy', 'cut'].forEach(function (type) {
        on(document, type, function (e) {
          if (isEditable(e.target)) return;
          e.preventDefault();
          violation('copy');
        });
      });

      on(document, 'keydown', function (e) {
        var key = String(e.key || '').toLowerCase();

        if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.indexOf(key) !== -1) {
          if (isEditable(e.target) && ['c', 'x', 'a', 'v'].indexOf(key) !== -1) return;
          e.preventDefault();
          violation(key === 'p' || key === 's' ? 'capture' : 'copy');
          return;
        }
        if (key === 'printscreen') {
          e.preventDefault();
          onCapture();
        }
      });

      on(document, 'keyup', function (e) {
        if (String(e.key || '').toLowerCase() === 'printscreen') onCapture();
      });

      on(document, 'visibilitychange', function () {
        if (!running) return;
        var app = document.getElementById('app');
        if (document.hidden) {
          if (app) app.style.opacity = '0';
          violation('tab');
          pause('tab');
        } else {
          if (app) app.style.opacity = '1';
        }
      });

      on(document, 'fullscreenchange', onFullscreenChange);
      on(document, 'webkitfullscreenchange', onFullscreenChange);

      on(global, 'blur', function () { 
          document.body.classList.add('exam-unfocused'); 
          var app = document.getElementById('app');
          if (app) app.style.opacity = '0';
      });
      on(global, 'focus', function () { 
          document.body.classList.remove('exam-unfocused'); 
          var app = document.getElementById('app');
          if (app) app.style.opacity = '1';
      });

      on(global, 'beforeprint', function () { violation('capture'); });

      devToolsTrap1 = global.setInterval(function() {
        var start = performance.now();
        debugger;
        var end = performance.now();
        if (end - start > 100) triggerDevToolsViolation();
      }, 1000);

      devToolsTrap2 = global.setInterval(function() {
        if (window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160) {
            triggerDevToolsViolation();
        }
      }, 1000);
    }

    function onFullscreenChange() {
      if (!running || !enforce) return;
      if (!isFullscreen()) {
        violation('fullscreen');
        pause('fullscreen');
      }
    }

    var captureAt = 0;
    function onCapture() {
      var now = Date.now();
      if (now - captureAt < 800) return;   /* keydown + keyup = satu kejadian */
      captureAt = now;
      violation('capture');
      document.body.classList.add('exam-unfocused');
      global.setTimeout(function () {
        if (!document.hasFocus || document.hasFocus()) {
          document.body.classList.remove('exam-unfocused');
        }
      }, 1200);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('[Nihonggo Club] Tangkapan layar tidak diizinkan selama ujian.')
            .catch(function () {});
        }
      } catch (err) { /* diabaikan */ }
    }

    /* --- API ------------------------------------------------------------ */
    function start() {
      if (running) return Promise.resolve();
      var step = enforce && supported ? requestFullscreen() : Promise.resolve();
      return step.then(function () {
        running = true;
        paused = false;
        reason = null;
        document.body.classList.add('exam-active');
        install();
        emit();
      });
    }

    function stop() {
      running = false;
      paused = false;
      offAll();
      global.clearInterval(devToolsTrap1);
      global.clearInterval(devToolsTrap2);
      document.body.classList.remove('exam-active', 'exam-paused', 'exam-unfocused');
      var appContainer = document.getElementById('app');
      if (appContainer) appContainer.style.opacity = '1';
      return exitFullscreen();
    }

    function summary() {
      var total = Object.keys(counts).reduce(function (n, k) { return n + counts[k]; }, 0);
      return {
        enforced: enforce,
        fullscreen: enforce && supported,
        total: total,
        counts: {
          fullscreen: counts.fullscreen,
          tab: counts.tab,
          copy: counts.copy,
          capture: counts.capture,
          devtools: counts.devtools
        }
      };
    }

    return {
      start: start,
      stop: stop,
      pause: pause,
      resume: resume,
      summary: summary,
      isFullscreen: isFullscreen,
      isSupported: function () { return supported; },
      isRunning: function () { return running; }
    };
  }

  NC.createProctor = createProctor;
  NC.PROCTOR_LABELS = LABELS;
})(window);
