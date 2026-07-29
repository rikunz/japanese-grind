/* ==========================================================================
   Nihonggo Club — lembar soal cetak
   print.html?quiz=week1/day3-bunpou        → lembar soal kosong
   print.html?quiz=week1/day3-bunpou&key=1  → lembar soal + kunci jawaban
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var slug = NC.param('quiz');
  var showKey = NC.param('key') === '1';

  init();

  async function init() {
    var quiz;
    try {
      quiz = await NC.loadQuiz(slug);
    } catch (err) {
      NC.renderError(app, err);
      return;
    }
    document.title = 'Lembar soal · ' + quiz.title + ' — Nihonggo Club';
    app.innerHTML = toolbar() + paper(quiz);
    document.getElementById('printBtn').addEventListener('click', function () { window.print(); });
  }

  function toolbar() {
    var q = encodeURIComponent(slug);
    return '<div class="print-toolbar">' +
      '<a class="btn btn--outline btn--sm" href="quiz.html?quiz=' + q + '">← Kerjakan online</a>' +
      '<div class="spacer"></div>' +
      (showKey
        ? '<a class="btn btn--ghost btn--sm" href="print.html?quiz=' + q + '">Sembunyikan kunci</a>'
        : '<a class="btn btn--ghost btn--sm" href="print.html?quiz=' + q + '&key=1">Tampilkan kunci jawaban</a>') +
      '<button type="button" class="btn btn--primary btn--sm" id="printBtn">Cetak (Ctrl + P)</button>' +
    '</div>';
  }

  function paper(quiz) {
    var lastSection = null;
    var lastPassage = '';
    var body = '';

    quiz.questions.forEach(function (q, i) {
      if (q.section !== lastSection) {
        lastSection = q.section;
        if (q.section) body += '<div class="p-section">' + NC.esc(q.section) + '</div>';
      }
      if (q.passage && q.passage !== lastPassage) {
        lastPassage = q.passage;
        body += '<div class="p-passage">' + NC.esc(q.passage) + '</div>';
      }
      body += question(q, i + 1);
    });

    return '<div class="paper">' +
      '<div class="paper-head">' +
        '<div class="paper-head__top">' +
          '<img src="assets/logo.svg" alt="">' +
          '<span>Nihonggo Club · 練習問題</span>' +
          (quiz.level ? '<span class="level">' + NC.esc(quiz.level) + '</span>' : '') +
        '</div>' +
        '<div class="paper-title">' + NC.esc(quiz.title) +
          (showKey ? '<span class="key-flag">KUNCI JAWABAN</span>' : '') + '</div>' +
        (quiz.description ? '<div class="paper-sub">' + NC.esc(quiz.description) + '</div>' : '') +
      '</div>' +

      '<div class="paper-fields">' +
        '<div class="paper-field"><span>氏名 / Nama</span><i></i></div>' +
        '<div class="paper-field paper-field--sm"><span>日付 / Tanggal</span><i></i></div>' +
        '<div class="paper-field paper-field--sm"><span>点数 / Nilai</span><i></i></div>' +
      '</div>' +

      '<div class="paper-notice">' +
        '<b>注意 / Petunjuk:</b> Jumlah soal <b>' + quiz.questions.length + '</b> · total <b>' +
        quiz.totalPoints + ' poin</b> · batas lulus <b>' + quiz.passingScore + ' poin</b>. ' +
        'Hitamkan satu kotak (□) untuk jawaban yang paling tepat. Tulis jawaban isian pada garis yang tersedia.' +
      '</div>' +

      body +
      answerSheet(quiz) +

      '<div class="paper-foot">' +
        '<span>Nihonggo Club — ' + NC.esc(quiz.slug) + '</span>' +
        '<span>' + (showKey ? 'Lembar kunci — jangan dibagikan ke peserta' : 'Selamat mengerjakan · がんばって！') + '</span>' +
      '</div>' +
    '</div>';
  }

  function question(q, no) {
    var out = '<div class="p-q">';
    out += '<div class="p-q__text"><span class="p-q__no">' + no + '.</span><span>' +
      NC.esc(q.question || q.instruction || '') +
      ' <span style="font-family:var(--font-sans);font-size:11px;color:#666">(' + q.points + ' poin)</span>' +
      '</span></div>';

    if (q.context) out += '<div class="p-q__context">' + NC.esc(q.context) + '</div>';
    if (q.instruction && q.question) out += '<div class="p-q__instruction">' + NC.esc(q.instruction) + '</div>';
    if (q.sentence) out += '<div class="p-q__sentence">' + NC.esc(q.sentence) + '</div>';

    if (q.type === 'text') {
      out += showKey
        ? '<div class="p-key-text">' + NC.esc(accepted(q).join(' / ')) + '</div>'
        : '<div class="p-answer-line"></div>';
    } else {
      out += '<div class="p-options">' + q.options.map(function (opt, i) {
        var isKey = showKey && Number(q.answer) === i + 1;
        return '<span class="p-option' + (isKey ? ' is-key' : '') + '">' +
          '<span class="p-option__box"></span>' + NC.circled(i + 1) + ' ' + NC.esc(opt) + '</span>';
      }).join('') + '</div>';
    }

    return out + '</div>';
  }

  function accepted(q) {
    return Array.isArray(q.answer) ? q.answer : [q.answer];
  }

  function answerSheet(quiz) {
    var rows = quiz.questions.map(function (q, i) {
      var cell;
      if (showKey) {
        cell = q.type === 'text'
          ? '<td class="key">' + NC.esc(accepted(q).join(' / ')) + '</td>'
          : '<td class="key">' + NC.circled(Number(q.answer)) + '</td>';
      } else {
        cell = q.type === 'text'
          ? '<td></td>'
          : '<td class="marks">' + q.options.map(function (_, j) { return NC.circled(j + 1); }).join('') + '</td>';
      }
      return '<tr><td>' + (i + 1) + '</td>' + cell + '<td>' + q.points + '</td></tr>';
    }).join('');

    return '<div class="p-sheet">' +
      '<div class="p-sheet__title">解答らん / ' + (showKey ? 'Kunci Jawaban' : 'Lembar Jawaban') + '</div>' +
      '<table>' +
        '<thead><tr><th style="width:14%">No.</th><th>' +
          (showKey ? 'Kunci' : 'Jawaban (lingkari / isi)') + '</th><th style="width:14%">Poin</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
  }
})();
