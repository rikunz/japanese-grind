/* ==========================================================================
   Nihonggo Club — beranda
   Struktur: level → minggu → hari, plus progres dari localStorage
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var tabsEl = document.getElementById('levelTabs');
  var manifest = null;
  var levels = [];
  var activeId = null;

  var ICON_PLAY = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.4c0-.5.6-.9 1-.6l6 4.2c.4.3.4.9 0 1.2l-6 4.2c-.4.3-1 0-1-.6V3.4z"/></svg>';
  var ICON_PRINT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4.5 6V2.5h7V6M4.5 11.5h7V14h-7z"/><path d="M4.5 6h-2v5.5h11V6h-2"/></svg>';
  var ICON_CERT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="6.5" r="3.5"/><path d="M5.8 9.6 5 14l3-1.6L11 14l-.8-4.4"/></svg>';

  init();

  async function init() {
    try {
      manifest = await NC.loadManifest();
    } catch (err) {
      NC.renderError(app, err);
      return;
    }

    if (manifest.brand && manifest.brand.tagline) {
      document.getElementById('tagline').textContent = manifest.brand.tagline;
    }

    levels = NC.levels(manifest);
    var wanted = (NC.param('level') || '').toLowerCase();
    var match = levels.filter(function (l) { return String(l.id).toLowerCase() === wanted; })[0];
    activeId = (match || levels[0] || {}).id;

    renderTabs();
    renderLevel();
    bindTabs();
    bindReset();
  }

  function bindTabs() {
    tabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.level-tab');
      if (!btn || btn.dataset.level === activeId) return;
      activeId = btn.dataset.level;
      history.replaceState(null, '', 'index.html?level=' + encodeURIComponent(activeId));
      renderTabs();
      renderLevel();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function currentLevel() {
    return levels.filter(function (l) { return l.id === activeId; })[0] || levels[0];
  }

  /* --- Tab level --------------------------------------------------------- */
  function renderTabs() {
    if (levels.length < 1) return;
    var progress = NC.getProgress();

    tabsEl.innerHTML = levels.map(function (level) {
      var days = (level.weeks || []).reduce(function (n, w) { return n + (w.days || []).length; }, 0);
      var done = 0;
      (level.weeks || []).forEach(function (w) {
        (w.days || []).forEach(function (d) { if (progress[d.slug]) done++; });
      });
      return '<button type="button" class="level-tab' + (level.id === activeId ? ' is-active' : '') +
        '" data-level="' + NC.esc(level.id) + '">' +
        '<span class="level-tab__name">' + NC.esc(level.title || level.id) + '</span>' +
        '<span class="level-tab__meta">' + done + '/' + days + ' materi</span>' +
      '</button>';
    }).join('');
    tabsEl.hidden = false;
  }

  /* --- Isi level --------------------------------------------------------- */
  function renderLevel() {
    var level = currentLevel();
    var progress = NC.getProgress();
    var weeks = (level && level.weeks) || [];

    renderStats(weeks, progress, level);

    if (!weeks.length) {
      app.innerHTML = '<div class="state"><div class="state__title">Belum ada materi</div>' +
        '<div class="state__desc">Tambahkan minggu dan hari untuk level ini pada ' +
        '<code>data/manifest.json</code>.</div></div>';
      return;
    }

    app.innerHTML =
      (level.subtitle ? '<p class="level-note">' + NC.esc(level.subtitle) + '</p>' : '') +
      weeks.map(function (week) {
        var days = week.days || [];
        var done = days.filter(function (d) { return progress[d.slug]; }).length;
        return '' +
          '<section class="week">' +
            '<div class="week__head">' +
              '<h2 class="week__title jp">' + NC.esc(week.title || week.id) + '</h2>' +
              '<span class="week__sub">' + NC.esc(week.subtitle || '') + '</span>' +
              '<span class="week__count">' + done + '/' + days.length + ' selesai</span>' +
            '</div>' +
            '<div class="day-list">' +
              days.map(function (day) { return dayCard(day, progress[day.slug], level); }).join('') +
            '</div>' +
          '</section>';
      }).join('');
  }

  function dayCard(day, prog, level) {
    var q = NC.encodeSlug(day.slug);
    var passingText = day.passing && day.points
      ? 'Lulus ≥ ' + day.passing + '/' + day.points
      : 'Lulus ≥ 60%';
    var levelTag = day.level || (level && level.title) || '';

    var stateClass = '';
    var scoreBlock =
      '<div class="day-score">' +
        '<div class="day-score__value">–</div>' +
        '<div class="day-score__note">Belum dikerjakan</div>' +
      '</div>';

    if (prog) {
      stateClass = prog.passed ? ' is-passed' : ' is-failed';
      scoreBlock =
        '<div class="day-score">' +
          '<div class="day-score__value ' + (prog.passed ? 'is-pass' : 'is-fail') + '">' + prog.percent + '%</div>' +
          '<div class="day-score__note">' + (prog.passed ? 'Lulus' : 'Belum lulus') +
            ' · ' + prog.attempts + '×</div>' +
        '</div>';
    }

    var certBtn = prog && prog.passed
      ? '<a class="btn btn--outline btn--sm" href="certificate.html?quiz=' + q + '" title="Sertifikat">' + ICON_CERT + '</a>'
      : '';

    return '' +
      '<article class="day-card' + stateClass + '">' +
        '<div class="day-card__main">' +
          '<div class="day-card__tags">' +
            '<span class="badge badge--brand">' + NC.esc(day.day || '') + '</span>' +
            (day.tag ? '<span class="badge jp">' + NC.esc(day.tag) + '</span>' : '') +
            (levelTag ? '<span class="badge badge--muted">' + NC.esc(levelTag) + '</span>' : '') +
          '</div>' +
          '<h3 class="day-card__title">' + NC.esc(day.title || day.slug) + '</h3>' +
          '<p class="day-card__sub">' + NC.esc(day.subtitle || '') + '</p>' +
          '<div class="day-card__meta">' +
            '<span>' + (day.questions ? day.questions + ' soal' : 'Latihan') + '</span>' +
            '<span>' + passingText + '</span>' +
            (prog ? '<span>Terakhir: ' + NC.esc(NC.dateID(prog.date)) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="day-card__side">' +
          scoreBlock +
          '<div class="day-card__actions">' +
            '<a class="btn btn--outline btn--sm" href="print.html?quiz=' + q + '" title="Cetak soal">' + ICON_PRINT + '</a>' +
            certBtn +
            '<a class="btn btn--primary btn--sm" href="quiz.html?quiz=' + q + '">' + ICON_PLAY +
              (prog ? 'Ulangi' : 'Mulai') + '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderStats(weeks, progress, level) {
    var all = weeks.reduce(function (acc, w) { return acc.concat(w.days || []); }, []);
    var stats = document.getElementById('stats');
    if (!all.length) { stats.hidden = true; return; }

    var doneList = all.filter(function (d) { return progress[d.slug]; });
    var passed = doneList.filter(function (d) { return progress[d.slug].passed; });
    var avg = doneList.length
      ? Math.round(doneList.reduce(function (s, d) { return s + progress[d.slug].percent; }, 0) / doneList.length)
      : null;

    document.getElementById('statLabel').textContent =
      'Selesai' + (level && level.title ? ' · ' + level.title : '');
    document.getElementById('statDone').firstChild.nodeValue = String(doneList.length);
    document.getElementById('statTotal').textContent = '/' + all.length;
    document.getElementById('statAvg').textContent = avg == null ? '—' : avg + '%';
    document.getElementById('statPass').textContent = String(passed.length);
    document.getElementById('statCert').textContent = String(passed.length);
    stats.hidden = false;
  }

  function bindReset() {
    document.getElementById('resetProgress').addEventListener('click', function () {
      if (!Object.keys(NC.getProgress()).length) {
        alert('Belum ada progres yang tersimpan.');
        return;
      }
      if (confirm('Hapus semua progres, riwayat, dan hasil quiz di browser ini?')) {
        NC.resetProgress();
        location.reload();
      }
    });
  }
})();
