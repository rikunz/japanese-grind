/* ==========================================================================
   Nihonggo Club — beranda
   Dua tahap: pilih level (N5–N1) → daftar minggu & hari pada level itu
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var tabsEl = document.getElementById('levelTabs');
  var statsEl = document.getElementById('stats');
  var heroSub = document.getElementById('tagline');

  var manifest = null;
  var levels = [];
  var activeId = null;          /* null = layar pilih level */

  /* Nada warna per level, dari palet biru (mudah → sulit) */
  var TONES = ['#64b5f6', '#42a5f5', '#1e88e5', '#1565c0', '#0d47a1'];

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

    if (manifest.brand && manifest.brand.tagline && heroSub) {
      heroSub.textContent = manifest.brand.tagline;
    }

    levels = NC.levels(manifest);
    var wanted = (NC.param('level') || '').toLowerCase();
    var match = levels.filter(function (l) { return String(l.id).toLowerCase() === wanted; })[0];
    activeId = match ? match.id : null;

    bindTabs();
    bindReset();
    render();

    window.addEventListener('popstate', function () {
      var id = (NC.param('level') || '').toLowerCase();
      var found = levels.filter(function (l) { return String(l.id).toLowerCase() === id; })[0];
      activeId = found ? found.id : null;
      render();
    });
  }

  function go(id, push) {
    activeId = id;
    var url = id ? NC.page('index') + '?level=' + encodeURIComponent(id) : NC.page('index');
    if (push) { history.pushState(null, '', url); } else { history.replaceState(null, '', url); }
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    if (activeId) renderLevel(); else renderChooser();
  }

  /* --- Hitungan progres -------------------------------------------------- */
  function daysOf(level) {
    return (level.weeks || []).reduce(function (acc, w) { return acc.concat(w.days || []); }, []);
  }

  function tally(days, progress) {
    var done = days.filter(function (d) { return progress[d.slug]; });
    var passed = done.filter(function (d) { return progress[d.slug].passed; });
    var avg = done.length
      ? Math.round(done.reduce(function (s, d) { return s + progress[d.slug].percent; }, 0) / done.length)
      : null;
    return { total: days.length, done: done.length, passed: passed.length, avg: avg };
  }

  /* --- Layar 1: pilih level ---------------------------------------------- */
  function renderChooser() {
    var progress = NC.getProgress();
    tabsEl.hidden = true;

    var all = levels.reduce(function (acc, l) { return acc.concat(daysOf(l)); }, []);
    showStats(tally(all, progress), 'Selesai');

    app.innerHTML =
      '<div class="chooser-head">' +
        '<h2>Pilih level</h2>' +
        '<p>Materi dikelompokkan per level JLPT. Pilih dulu levelmu, daftar latihannya menyusul.</p>' +
      '</div>' +
      '<div class="level-grid">' +
        levels.map(function (level, i) { return levelCard(level, i, progress); }).join('') +
      '</div>';

    app.querySelectorAll('.level-card').forEach(function (card) {
      card.addEventListener('click', function () { go(card.dataset.level, true); });
    });
  }

  function levelCard(level, index, progress) {
    var t = tally(daysOf(level), progress);
    var tone = TONES[index % TONES.length];
    var empty = t.total === 0;
    var pct = t.total ? Math.round((t.done / t.total) * 100) : 0;

    return '' +
      '<button type="button" class="level-card' + (empty ? ' is-empty' : '') + '" ' +
        'data-level="' + NC.esc(level.id) + '" style="--tone:' + tone + '">' +
        '<span class="level-card__top">' +
          '<span class="level-card__code">' + NC.esc(level.title || level.id) + '</span>' +
          (empty
            ? '<span class="badge badge--muted">Segera hadir</span>'
            : (t.done === t.total
                ? '<span class="badge badge--pass">Selesai</span>'
                : '<span class="badge badge--brand">' + t.total + ' materi</span>')) +
        '</span>' +
        '<span class="level-card__desc">' + NC.esc(level.subtitle || '') + '</span>' +
        '<span class="level-card__foot">' +
          (empty
            ? '<span class="muted">Materi belum tersedia</span>'
            : '<span>' + t.done + ' dari ' + t.total + ' selesai</span><span class="mono">' + pct + '%</span>') +
        '</span>' +
        (empty ? '' : '<span class="level-card__bar"><span style="width:' + pct + '%"></span></span>') +
      '</button>';
  }

  /* --- Layar 2: isi level ------------------------------------------------ */
  function renderLevel() {
    var level = levels.filter(function (l) { return l.id === activeId; })[0];
    if (!level) { go(null); return; }

    var progress = NC.getProgress();
    var weeks = level.weeks || [];
    renderTabs(progress);
    showStats(tally(daysOf(level), progress), 'Selesai · ' + (level.title || level.id));

    var head =
      '<div class="level-head">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="backToLevels">← Semua level</button>' +
        '<div>' +
          '<h2 class="level-head__title">' + NC.esc(level.title || level.id) + '</h2>' +
          (level.subtitle ? '<p class="level-head__sub">' + NC.esc(level.subtitle) + '</p>' : '') +
        '</div>' +
      '</div>';

    if (!weeks.length) {
      app.innerHTML = head +
        '<div class="state">' +
          '<div class="state__title">Materi ' + NC.esc(level.title || level.id) + ' belum tersedia</div>' +
          '<div class="state__desc">Tambahkan minggu dan hari untuk level ini pada ' +
            '<code>data/manifest.json</code>, lalu simpan file soalnya di ' +
            '<code>data/' + NC.esc(level.id) + '/</code>.</div>' +
          '<button type="button" class="btn btn--outline" id="backToLevels2">Pilih level lain</button>' +
        '</div>';
    } else {
      app.innerHTML = head + weeks.map(function (week) {
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

    ['backToLevels', 'backToLevels2'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function () { go(null, true); });
    });
  }

  function dayCard(day, prog, level) {
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
      ? '<a class="btn btn--outline btn--sm" href="' + NC.href('certificate', day.slug) +
        '" title="Sertifikat">' + ICON_CERT + '</a>'
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
            '<a class="btn btn--outline btn--sm" href="' + NC.href('print', day.slug) +
              '" title="Cetak soal">' + ICON_PRINT + '</a>' +
            certBtn +
            '<a class="btn btn--primary btn--sm" href="' + NC.href('quiz', day.slug) + '">' + ICON_PLAY +
              (prog ? 'Ulangi' : 'Mulai') + '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* --- Tab level (hanya di layar isi level) ------------------------------ */
  function renderTabs(progress) {
    tabsEl.innerHTML = levels.map(function (level) {
      var t = tally(daysOf(level), progress);
      return '<button type="button" class="level-tab' + (level.id === activeId ? ' is-active' : '') +
        (t.total ? '' : ' is-empty') + '" data-level="' + NC.esc(level.id) + '">' +
        '<span class="level-tab__name">' + NC.esc(level.title || level.id) + '</span>' +
        '<span class="level-tab__meta">' + (t.total ? t.done + '/' + t.total : '—') + '</span>' +
      '</button>';
    }).join('');
    tabsEl.hidden = false;
  }

  function bindTabs() {
    tabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.level-tab');
      if (!btn || btn.dataset.level === activeId) return;
      go(btn.dataset.level, true);
    });
  }

  /* --- Stat strip -------------------------------------------------------- */
  function showStats(t, label) {
    if (!t.total) { statsEl.hidden = true; return; }
    document.getElementById('statLabel').textContent = label;
    document.getElementById('statDone').firstChild.nodeValue = String(t.done);
    document.getElementById('statTotal').textContent = '/' + t.total;
    document.getElementById('statAvg').textContent = t.avg == null ? '—' : t.avg + '%';
    document.getElementById('statPass').textContent = String(t.passed);
    document.getElementById('statCert').textContent = String(t.passed);
    statsEl.hidden = false;
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
