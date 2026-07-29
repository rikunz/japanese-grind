/* ==========================================================================
   Nihonggo Club — halaman hasil
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var slug = NC.quizSlug();
  var result = slug ? NC.getResult(slug) : null;

  if (!slug) {
    NC.renderPicker(app, {
      page: 'result',
      title: 'Pilih hasil latihan',
      desc: 'Halaman hasil dibuka tanpa parameter <code>?quiz=</code>. Pilih materi yang mau dilihat hasilnya.'
    });
    return;
  }

  if (!result) {
    app.innerHTML =
      '<div class="state">' +
        '<div class="state__title">Belum ada hasil untuk latihan ini</div>' +
        '<div class="state__desc">Hasil disimpan di browser yang dipakai mengerjakan. ' +
          'Kerjakan quiz-nya dulu, ya.</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<a class="btn btn--primary" href="' + NC.href('quiz', slug) + '">Kerjakan sekarang</a>' +
          '<a class="btn btn--outline" href="' + NC.page('index') + '">Beranda</a>' +
        '</div>' +
      '</div>';
    return;
  }

  document.title = 'Hasil · ' + result.title + ' — Nihonggo Club';
  render(result);

  function render(r) {
    var passLeft = Math.max(0, r.passingScore - r.score);

    app.innerHTML = '' +
      '<div class="report">' +
        '<div class="report__stripe"></div>' +

        '<div class="report__head">' +
          '<div>' +
            '<div class="report__eyebrow">成績通知 · LAPORAN HASIL</div>' +
            '<h1 class="report__title">' + NC.esc(r.title) + '</h1>' +
            (r.description ? '<p class="report__desc">' + NC.esc(r.description) + '</p>' : '') +
          '</div>' +
          '<div class="stamp' + (r.passed ? '' : ' stamp--fail') + '">' +
            '<div>' +
              '<div class="stamp__jp">' + (r.passed ? '合格' : '不合格') + '</div>' +
              '<div class="stamp__en">' + (r.passed ? 'PASSED' : 'NOT YET') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="report__meta">' +
          cell('Nama', NC.esc(r.name || '—')) +
          cell('Tanggal', NC.esc(NC.dateID(r.date))) +
          cell('Percobaan ke', String(r.seq || 1)) +
          cell('No. Sertifikat', '<span class="mono">' + NC.esc(r.certNumber || '—') + '</span>') +
        '</div>' +

        '<div class="score-row">' +
          '<div class="score-main">' +
            '<div class="score-main__value">' + r.score + '<span>/' + r.total + '</span></div>' +
            '<div class="score-main__label jp">得点 · Total Skor</div>' +
          '</div>' +
          '<div class="score-gauge">' +
            '<div class="score-gauge__top">' +
              '<span>Pencapaian <b>' + r.percent + '%</b></span>' +
              '<span>Batas lulus <b>' + r.passingPercent + '%</b></span>' +
            '</div>' +
            '<div class="gauge">' +
              '<div class="gauge__fill' + (r.passed ? '' : ' is-fail') + '" style="width:' + NC.clamp(r.percent, 0, 100) + '%"></div>' +
              '<div class="gauge__mark" style="left:' + NC.clamp(r.passingPercent, 0, 100) + '%"></div>' +
            '</div>' +
            '<div class="score-gauge__note">' +
              'Benar ' + r.correctCount + ' dari ' + r.questionCount + ' soal · ' +
              (r.passed
                ? 'Melewati batas lulus ' + r.passingScore + ' poin.'
                : 'Kurang ' + passLeft + ' poin lagi dari batas lulus ' + r.passingScore + ' poin.') +
            '</div>' +
          '</div>' +
        '</div>' +

        sectionTable(r) +
        integrity(r) +

        (r.passed ? '' :
          '<p class="locked-note">Sertifikat terbit bila skor mencapai ' + r.passingScore +
          ' dari ' + r.total + ' poin. Coba lagi setelah membaca pembahasan di bawah.</p>') +

        '<div class="actions">' +
          '<a class="btn btn--primary" href="' + NC.href('quiz', r.slug) + '">Kerjakan ulang</a>' +
          '<a class="btn btn--outline" href="' + NC.href('print', r.slug) + '">Cetak soal</a>' +
          '<div class="spacer"></div>' +
          (r.passed
            ? '<a class="btn btn--secondary" href="' + NC.href('certificate', r.slug) + '">Lihat sertifikat</a>'
            : '<span class="btn btn--secondary" aria-disabled="true">Sertifikat terkunci</span>') +
        '</div>' +

        '<div class="answer-grid">' + r.details.map(function (d, i) {
          return '<a class="answer-chip ' + (d.correct ? 'is-correct' : 'is-wrong') +
            '" href="#r-' + d.id + '" title="Soal ' + (i + 1) + ' — ' +
            (d.correct ? 'benar' : 'salah') + '">' + (i + 1) + '</a>';
        }).join('') + '</div>' +
        '<div style="padding:8px 24px 18px;font-size:12.5px;color:var(--muted)">' +
          'Klik nomor untuk melompat ke pembahasan.' +
        '</div>' +
      '</div>' +

      '<div class="review-head">' +
        '<h2 class="jp">解説 · Pembahasan</h2>' +
        '<span class="rule"></span>' +
      '</div>' +
      '<ol class="review">' + r.details.map(reviewItem).join('') + '</ol>';
  }

  function cell(label, value) {
    return '<div class="meta-cell">' +
      '<div class="meta-cell__label">' + label + '</div>' +
      '<div class="meta-cell__value">' + value + '</div>' +
    '</div>';
  }

  function sectionTable(r) {
    if (!r.sections || r.sections.length < 2) return '';
    return '<table class="score-table">' +
      '<caption>得点区分別得点 · Skor per bagian</caption>' +
      '<thead><tr>' +
        '<th>Bagian</th><th>Soal</th><th class="bar-cell">Pencapaian</th><th style="text-align:right">Skor</th>' +
      '</tr></thead>' +
      '<tbody>' + r.sections.map(function (s) {
        var pct = s.total ? Math.round((s.score / s.total) * 100) : 0;
        return '<tr>' +
          '<td class="jp">' + NC.esc(s.name) + '</td>' +
          '<td class="num">' + s.count + '</td>' +
          '<td><div class="bar"><span style="width:' + pct + '%"></span></div></td>' +
          '<td class="num">' + s.score + ' / ' + s.total + '</td>' +
        '</tr>';
      }).join('') + '</tbody>' +
      '<tfoot><tr>' +
        '<td>Total</td><td class="num">' + r.questionCount + '</td>' +
        '<td class="num">' + r.percent + '%</td>' +
        '<td class="num">' + r.score + ' / ' + r.total + '</td>' +
      '</tr></tfoot>' +
    '</table>';
  }

  function integrity(r) {
    var p = r.proctor;
    if (!p) return '';
    var labels = window.NC.PROCTOR_LABELS || {
      fullscreen: 'Keluar dari layar penuh', tab: 'Pindah tab atau jendela',
      copy: 'Percobaan menyalin teks', capture: 'Percobaan tangkapan layar / cetak'
    };
    var rows = Object.keys(p.counts || {})
      .filter(function (k) { return p.counts[k] > 0; })
      .map(function (k) {
        return '<li><span>' + NC.esc(labels[k] || k) + '</span><b>' + p.counts[k] + '×</b></li>';
      });

    var clean = !rows.length;
    return '<div class="integrity' + (clean ? ' is-clean' : ' is-flagged') + '">' +
      '<div class="integrity__head">' +
        '<span class="integrity__badge">' + (clean ? '✓' : '!') + '</span>' +
        '<div>' +
          '<b>' + (clean ? 'Tidak ada pelanggaran tercatat' : 'Catatan pelanggaran ujian') + '</b>' +
          '<span>' + (p.fullscreen
            ? 'Dikerjakan dalam mode ujian layar penuh.'
            : 'Mode ujian berjalan tanpa layar penuh (tidak didukung browser).') + '</span>' +
        '</div>' +
      '</div>' +
      (rows.length ? '<ul class="integrity__list">' + rows.join('') + '</ul>' : '') +
    '</div>';
  }

  function optionLabel(d, value) {
    if (value == null || value === '') return '<span class="muted">(kosong)</span>';
    if (d.type === 'text') return NC.esc(value);
    var idx = Number(value);
    var text = d.options[idx - 1];
    return NC.circled(idx) + (text ? ' ' + NC.esc(text) : '');
  }

  function correctLabel(d) {
    if (d.type === 'text') {
      var accept = Array.isArray(d.answer) ? d.answer : [d.answer];
      return accept.map(NC.esc).join(' / ');
    }
    return optionLabel(d, d.answer);
  }

  function reviewItem(d, i) {
    var head = d.question || d.sentence || '';
    return '<li class="review-item' + (d.correct ? '' : ' is-wrong') + '" id="r-' + d.id + '">' +
      '<div class="review-item__head">' +
        '<span class="review-num">' + (i + 1) + '</span>' +
        (d.section ? '<span class="badge badge--muted jp">' + NC.esc(d.section) + '</span>' : '') +
        '<span class="badge ' + (d.correct ? 'badge--pass">正解 Benar' : 'badge--fail">不正解 Salah') + '</span>' +
        '<span class="review-points">' + d.earned + '/' + d.points + '</span>' +
      '</div>' +
      (d.context ? '<div class="review-context">' + NC.esc(d.context) + '</div>' : '') +
      (d.instruction ? '<div class="text-sm muted">' + NC.esc(d.instruction) + '</div>' : '') +
      '<div class="review-q">' + NC.esc(head) + '</div>' +
      (d.sentence && d.sentence !== head ? '<div class="review-context">' + NC.esc(d.sentence) + '</div>' : '') +
      '<div class="review-ans">' +
        '<div class="review-ans__row">' +
          '<span class="review-ans__label">Jawaban kamu</span>' +
          '<span class="review-ans__value ' + (d.correct ? 'is-right' : 'is-wrong') + '">' +
            optionLabel(d, d.given) + '</span>' +
        '</div>' +
        (d.correct ? '' :
        '<div class="review-ans__row">' +
          '<span class="review-ans__label">Kunci jawaban</span>' +
          '<span class="review-ans__value is-right">' + correctLabel(d) + '</span>' +
        '</div>') +
      '</div>' +
      (d.explanation ? '<div class="review-exp"><b>Penjelasan:</b> ' + NC.esc(d.explanation) + '</div>' : '') +
    '</li>';
  }
})();
