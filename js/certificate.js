/* ==========================================================================
   Nihonggo Club — sertifikat
   Sumber data: parameter URL (name/score/total/date/no) atau hasil di localStorage.
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var slug = NC.quizSlug();

  init();

  async function init() {
    if (!slug) {
      NC.renderPicker(app, {
        page: 'certificate.html',
        title: 'Pilih sertifikat',
        desc: 'Sertifikat terbit per materi. Pilih materi yang sudah kamu selesaikan.'
      });
      return;
    }

    var quiz, manifest = null;
    try {
      quiz = await NC.loadQuiz(slug);
    } catch (err) {
      NC.renderError(app, err);
      return;
    }
    try { manifest = await NC.loadManifest(); } catch (e) { /* opsional */ }

    var stored = NC.getResult(slug);
    var name = NC.param('name') || (stored && stored.name) || NC.getName();
    var score = num(NC.param('score'), stored ? stored.score : null);
    var total = num(NC.param('total'), stored ? stored.total : quiz.totalPoints);
    var date = NC.param('date') || (stored && stored.date) || NC.isoDate(new Date());
    var certNo = NC.param('no') || (stored && stored.certNumber) ||
      NC.certNumber(slug, date, stored ? stored.seq : 1);

    if (score == null) {
      app.innerHTML = lockedNoResult();
      return;
    }

    var passed = score >= quiz.passingScore;
    document.title = 'Sertifikat · ' + quiz.title + ' — Nihonggo Club';

    if (!passed) {
      app.innerHTML = lockedLowScore(score, total, quiz.passingScore);
      return;
    }

    app.innerHTML = sheet({
      brand: (manifest && manifest.brand) || {},
      course: course(manifest, quiz),
      name: name || '—',
      score: score,
      total: total,
      passing: quiz.passingScore,
      date: date,
      certNo: certNo
    });

    document.getElementById('printCert').addEventListener('click', function () { window.print(); });
  }

  function num(value, fallback) {
    var n = Number(value);
    return value != null && value !== '' && isFinite(n) ? n : fallback;
  }

  function course(manifest, quiz) {
    var found = manifest ? NC.findDay(manifest, slug) : null;
    if (!found) {
      return { jp: quiz.title, en: quiz.description || '' };
    }
    var levelTitle = found.level.title || quiz.level || '';
    var weekNum = (/\d+/.exec(found.week.id || '') || [''])[0];
    var parts = [levelTitle, found.week.title, found.day.title].filter(Boolean);
    var en = [
      levelTitle ? 'Level ' + levelTitle : '',
      weekNum ? 'Week ' + weekNum : '',
      found.day.day || ''
    ].filter(Boolean).join(' · ');
    var sub = found.day.subtitle || quiz.description || '';
    return {
      jp: parts.join('　'),
      en: sub ? en + ' — ' + sub : en
    };
  }

  /* --- Markup ------------------------------------------------------------ */
  function sheet(d) {
    var issuer = d.brand.issuer || 'Nihonggo Club';
    var issuerJp = d.brand.issuerJp || 'にほんごクラブ';
    var signer = d.brand.signerName || issuer;
    var role = d.brand.signerRole || 'Class Instructor';

    return '' +
    '<div class="cert-toolbar">' +
      '<a class="btn btn--outline btn--sm" href="result.html?quiz=' + NC.encodeSlug(slug) + '">← Kembali ke hasil</a>' +
      '<div class="spacer"></div>' +
      '<a class="btn btn--ghost btn--sm" href="index.html">Beranda</a>' +
      '<button type="button" class="btn btn--primary btn--sm" id="printCert">Cetak / Simpan PDF</button>' +
    '</div>' +

    '<div class="cert-stage"><div class="cert-sheet">' +
      '<img class="cert-watermark" src="assets/watermark.svg" alt="">' +
      '<div class="cert-frame">' +

        '<div class="cert-top">' +
          '<div class="cert-brand">' +
            '<img src="assets/logo.svg" alt="">' +
            '<div>' +
              '<div class="cert-brand__name">' + NC.esc(issuer.toUpperCase()) + '</div>' +
              '<div class="cert-brand__jp">' + NC.esc(issuerJp) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cert-no">証明書番号 / Certificate No.<b>' + NC.esc(d.certNo) + '</b></div>' +
        '</div>' +

        '<div class="cert-main">' +

        '<div class="cert-title-block">' +
          '<div class="cert-title">修了証明書</div>' +
          '<div class="cert-subtitle">CERTIFICATE OF COMPLETION</div>' +
          '<div class="cert-divider"></div>' +
        '</div>' +

        '<p class="cert-lead">この証書は、下記の者が当クラブの練習課程を修了したことを証明します。</p>' +

        '<div class="cert-name-block">' +
          '<div class="cert-name">' + NC.esc(d.name) + '</div>' +
          '<div class="cert-name-rule"></div>' +
          '<div class="cert-name-note">氏名 / NAME</div>' +
        '</div>' +

        '<div class="cert-course">' + NC.esc(d.course.jp) +
          (d.course.en ? '<span class="cert-course__sub">' + NC.esc(d.course.en) + '</span>' : '') +
        '</div>' +

        '<table class="cert-table">' +
          '<thead><tr>' +
            '<th>得点 SCORE</th><th>満点 MAX</th><th>基準点 PASSING</th><th>判定 RESULT</th>' +
          '</tr></thead>' +
          '<tbody><tr>' +
            '<td>' + d.score + '</td>' +
            '<td>' + d.total + '</td>' +
            '<td>' + d.passing + '</td>' +
            '<td class="verdict">合格<small>PASSED</small></td>' +
          '</tr></tbody>' +
        '</table>' +

        '</div>' +

        '<div class="cert-bottom">' +
          '<div class="cert-date">修了日 / DATE OF COMPLETION' +
            '<b>' + NC.dateJP(d.date) + '</b>' +
            '<span>' + NC.dateID(d.date) + '</span>' +
          '</div>' +
          '<div class="cert-sign">' +
            seal() +
            '<div class="cert-sign__name">' + NC.esc(signer) + '</div>' +
            '<div class="cert-sign__line"></div>' +
            '<div class="cert-sign__role">' + NC.esc(role) + '</div>' +
          '</div>' +
        '</div>' +

      '</div>' +
    '</div></div>' +

    '<p class="cert-note">Tips: pada dialog cetak pilih <b>Save as PDF</b>, ukuran <b>A4</b>, orientasi <b>Landscape</b>, ' +
    'dan aktifkan <b>Background graphics</b> agar warnanya ikut tercetak.</p>';
  }

  function seal() {
    return '' +
    '<svg class="cert-seal" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="47" fill="none" stroke="#0d47a1" stroke-width="3"/>' +
      '<circle cx="50" cy="50" r="41" fill="none" stroke="#1976d2" stroke-width="1"/>' +
      '<text x="50" y="44" text-anchor="middle" font-family="Noto Sans JP, sans-serif" ' +
        'font-size="26" font-weight="700" fill="#0d47a1" letter-spacing="2">認定</text>' +
      '<text x="50" y="64" text-anchor="middle" font-family="Noto Sans JP, sans-serif" ' +
        'font-size="9" fill="#1565c0" letter-spacing="1">にほんごクラブ</text>' +
      '<line x1="22" y1="52" x2="78" y2="52" stroke="#90caf9" stroke-width="0.8"/>' +
    '</svg>';
  }

  function lockedNoResult() {
    return '<div class="state cert-locked">' +
      '<div class="state__title">Sertifikat belum tersedia</div>' +
      '<div class="state__desc">Belum ada hasil untuk latihan ini di browser ini. ' +
        'Kerjakan quiz-nya dulu, sertifikat terbit otomatis jika skormu memenuhi batas lulus.</div>' +
      '<div class="btn-row" style="justify-content:center">' +
        '<a class="btn btn--primary" href="quiz.html?quiz=' + NC.encodeSlug(slug) + '">Kerjakan quiz</a>' +
        '<a class="btn btn--outline" href="index.html">Beranda</a>' +
      '</div>' +
    '</div>';
  }

  function lockedLowScore(score, total, passing) {
    return '<div class="state cert-locked">' +
      '<div class="state__title">Skor belum mencapai batas lulus</div>' +
      '<div class="state__desc">Sertifikat terbit setelah skormu mencapai batas lulus. ' +
        'Baca pembahasan di halaman hasil, lalu coba lagi.</div>' +
      '<div class="locked-score">' +
        '<div><div class="k">Skor kamu</div><div class="v">' + score + '/' + total + '</div></div>' +
        '<div><div class="k">Batas lulus</div><div class="v">' + passing + '/' + total + '</div></div>' +
      '</div>' +
      '<div class="btn-row" style="justify-content:center">' +
        '<a class="btn btn--primary" href="quiz.html?quiz=' + NC.encodeSlug(slug) + '">Coba lagi</a>' +
        '<a class="btn btn--outline" href="result.html?quiz=' + NC.encodeSlug(slug) + '">Lihat pembahasan</a>' +
      '</div>' +
    '</div>';
  }
})();
