/* ==========================================================================
   Nihonggo Club — beranda (daftar minggu & hari + progres)
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');

  var ICON_PLAY = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.4c0-.5.6-.9 1-.6l6 4.2c.4.3.4.9 0 1.2l-6 4.2c-.4.3-1 0-1-.6V3.4z"/></svg>';
  var ICON_PRINT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4.5 6V2.5h7V6M4.5 11.5h7V14h-7z"/><path d="M4.5 6h-2v5.5h11V6h-2"/></svg>';
  var ICON_CERT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="6.5" r="3.5"/><path d="M5.8 9.6 5 14l3-1.6L11 14l-.8-4.4"/></svg>';

  init();

  async function init() {
    var manifest;
    try {
      manifest = await NC.loadManifest();
    } catch (err) {
      NC.renderError(app, err);
      return;
    }

    if (manifest.brand && manifest.brand.tagline) {
      document.getElementById('tagline').textContent = manifest.brand.tagline;
    }

    var progress = NC.getProgress();
    var weeks = manifest.weeks || [];
    render(weeks, progress);
    renderStats(weeks, progress);
    bindReset();
  }

  function render(weeks, progress) {
    if (!weeks.length) {
      app.innerHTML = '<div class="state"><div class="state__title">Belum ada materi</div>' +
        '<div class="state__desc">Tambahkan minggu dan hari pada <code>data/manifest.json</code>.</div></div>';
      return;
    }

    app.innerHTML = weeks.map(function (week) {
      var days = week.days || [];
      var done = days.filter(function (d) { return progress[d.slug]; }).length;
      return '' +
        '<section class="week">' +
          '<div class="week__head">' +
            '<h2 class="week__title jp">' + NC.esc(week.title || week.id) + '</h2>' +
            '<span class="week__sub">' + NC.esc(week.subtitle || '') + '</span>' +
            '<span class="week__count">' + done + '/' + days.length + ' selesai</span>' +
          '</div>' +
          '<div class="day-list">' + days.map(function (day) { return dayCard(day, progress[day.slug]); }).join('') + '</div>' +
        '</section>';
    }).join('');
  }

  function dayCard(day, prog) {
    var slug = day.slug;
    var q = encodeURIComponent(slug);
    var passingText = day.passing && day.points
      ? 'Lulus ≥ ' + day.passing + '/' + day.points
      : 'Lulus ≥ 60%';

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
            (day.level ? '<span class="badge badge--muted">' + NC.esc(day.level) + '</span>' : '') +
          '</div>' +
          '<h3 class="day-card__title">' + NC.esc(day.title || slug) + '</h3>' +
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

  function renderStats(weeks, progress) {
    var all = weeks.reduce(function (acc, w) { return acc.concat(w.days || []); }, []);
    var doneList = all.filter(function (d) { return progress[d.slug]; });
    if (!all.length) return;

    var passed = doneList.filter(function (d) { return progress[d.slug].passed; });
    var avg = doneList.length
      ? Math.round(doneList.reduce(function (s, d) { return s + progress[d.slug].percent; }, 0) / doneList.length)
      : null;

    document.getElementById('statDone').firstChild.nodeValue = String(doneList.length);
    document.getElementById('statTotal').textContent = '/' + all.length;
    document.getElementById('statAvg').textContent = avg == null ? '—' : avg + '%';
    document.getElementById('statPass').textContent = String(passed.length);
    document.getElementById('statCert').textContent = String(passed.length);
    document.getElementById('stats').hidden = false;
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
