/* ==========================================================================
   Nihonggo Club — halaman quiz
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var slug = NC.param('quiz');
  var quiz = null;
  var answers = {};
  var submitted = false;

  init();

  async function init() {
    if (slug) {
      document.getElementById('printLink').href = 'print.html?quiz=' + encodeURIComponent(slug);
    }
    try {
      quiz = await NC.loadQuiz(slug);
    } catch (err) {
      NC.renderError(app, err);
      return;
    }
    document.title = quiz.title + ' — Nihonggo Club';
    render();
    bind();
  }

  /* --- Render ----------------------------------------------------------- */
  function render() {
    var lastPassage = '';
    var lastSection = null;
    var body = '';

    quiz.questions.forEach(function (q, i) {
      if (q.section !== lastSection) {
        lastSection = q.section;
        if (q.section) {
          body += '<div class="section-head">' +
            '<span class="section-head__label">' + NC.esc(q.section) + '</span>' +
            '<span class="section-head__rule"></span></div>';
        }
      }
      if (q.passage && q.passage !== lastPassage) {
        lastPassage = q.passage;
        body += '<div class="passage"><div class="passage__label">読み物 · Bacaan</div>' +
          NC.esc(q.passage) + '</div>';
      }
      body += questionCard(q, i + 1);
    });

    app.innerHTML = '' +
      '<div class="quiz-head">' +
        '<div class="quiz-head__tags">' +
          (quiz.level ? '<span class="badge badge--brand">' + NC.esc(quiz.level) + '</span>' : '') +
          '<span class="badge badge--muted">' + quiz.questions.length + ' soal</span>' +
          '<span class="badge badge--muted">' + quiz.totalPoints + ' poin</span>' +
        '</div>' +
        '<h1>' + NC.esc(quiz.title) + '</h1>' +
        (quiz.description ? '<p class="quiz-head__desc">' + NC.esc(quiz.description) + '</p>' : '') +
        '<div class="quiz-head__rules">' +
          '<span>Nilai lulus: <b>' + quiz.passingScore + ' / ' + quiz.totalPoints + '</b></span>' +
          '<span>Sertifikat terbit bila lulus</span>' +
          '<span>Tanpa batas waktu</span>' +
        '</div>' +
      '</div>' +

      (quiz.collectName ?
      '<div class="name-card">' +
        '<label class="field">' +
          '<span class="field__label">Nama peserta</span>' +
          '<input class="input" id="playerName" type="text" autocomplete="name" maxlength="60" ' +
            'placeholder="Tulis nama lengkap kamu" value="' + NC.esc(NC.getName()) + '">' +
        '</label>' +
        '<p class="field__hint">Nama ini dipakai pada halaman hasil dan sertifikat.</p>' +
        '<p class="field__error" id="nameError">Nama wajib diisi sebelum mengumpulkan jawaban.</p>' +
      '</div>' : '') +

      '<form id="quizForm" novalidate>' + body +
        '<div class="submit-bar">' +
          '<div class="submit-bar__progress">' +
            '<div class="submit-bar__text"><b id="answeredCount">0</b> dari <b>' +
              quiz.questions.length + '</b> soal terjawab</div>' +
            '<div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>' +
          '</div>' +
          '<button type="submit" class="btn btn--primary btn--lg" id="submitBtn">Kumpulkan jawaban</button>' +
        '</div>' +
      '</form>';
  }

  function questionCard(q, no) {
    var inner = '';

    if (q.context) inner += '<div class="q-context">' + NC.esc(q.context) + '</div>';
    if (q.instruction) inner += '<p class="q-instruction">' + NC.esc(q.instruction) + '</p>';
    if (q.question) inner += '<p class="q-text">' + NC.esc(q.question) + '</p>';
    if (q.sentence) inner += '<div class="q-sentence">' + NC.esc(q.sentence) + '</div>';

    if (q.type === 'text') {
      inner += '<input class="input answer-input" type="text" data-qid="' + q.id + '" ' +
        'autocomplete="off" placeholder="Tulis jawabanmu">';
    } else {
      inner += '<div class="options">' + q.options.map(function (opt, i) {
        var value = i + 1;
        return '<label class="option">' +
          '<input type="radio" name="q' + q.id + '" value="' + value + '" data-qid="' + q.id + '">' +
          '<span class="option__mark">' + NC.circled(value) + '</span>' +
          '<span class="option__text">' + NC.esc(opt) + '</span>' +
        '</label>';
      }).join('') + '</div>';
    }

    return '<article class="q-card" id="q-' + q.id + '">' +
      '<div class="q-card__head">' +
        '<span class="q-num">' + no + '</span>' +
        '<span class="q-points">' + q.points + ' poin</span>' +
      '</div>' + inner +
    '</article>';
  }

  /* --- Interaksi -------------------------------------------------------- */
  function bind() {
    var form = document.getElementById('quizForm');

    form.addEventListener('change', function (e) {
      var input = e.target;
      if (input.type !== 'radio') return;
      var qid = input.dataset.qid;
      answers[qid] = input.value;

      var group = input.closest('.options');
      if (group) {
        group.querySelectorAll('.option').forEach(function (o) { o.classList.remove('is-checked'); });
      }
      input.closest('.option').classList.add('is-checked');
      input.closest('.q-card').classList.remove('is-missing');
      updateProgress();
    });

    form.addEventListener('input', function (e) {
      var input = e.target;
      if (input.type !== 'text' || !input.dataset.qid) return;
      var value = input.value.trim();
      if (value) { answers[input.dataset.qid] = value; }
      else { delete answers[input.dataset.qid]; }
      input.closest('.q-card').classList.remove('is-missing');
      updateProgress();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit();
    });

    window.addEventListener('beforeunload', function (e) {
      if (submitted || !Object.keys(answers).length) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  function updateProgress() {
    var count = quiz.questions.filter(function (q) {
      return answers[q.id] != null && answers[q.id] !== '';
    }).length;
    document.getElementById('answeredCount').textContent = count;
    document.getElementById('progressFill').style.width =
      Math.round((count / quiz.questions.length) * 100) + '%';
  }

  function submit() {
    var name = '';
    if (quiz.collectName) {
      var nameInput = document.getElementById('playerName');
      name = nameInput.value.trim();
      var error = document.getElementById('nameError');
      if (!name) {
        error.classList.add('is-visible');
        nameInput.classList.add('input--invalid');
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      error.classList.remove('is-visible');
      nameInput.classList.remove('input--invalid');
    }

    var missing = quiz.questions.filter(function (q) {
      return answers[q.id] == null || answers[q.id] === '';
    });

    document.querySelectorAll('.q-card').forEach(function (c) { c.classList.remove('is-missing'); });
    if (missing.length) {
      missing.forEach(function (q) {
        var card = document.getElementById('q-' + q.id);
        if (card) card.classList.add('is-missing');
      });
      var ok = confirm('Masih ada ' + missing.length + ' soal yang belum dijawab.\n' +
        'Soal kosong dihitung salah. Tetap kumpulkan?');
      if (!ok) {
        document.getElementById('q-' + missing[0].id)
          .scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    submitted = true;
    var result = NC.grade(quiz, answers, name);
    NC.saveResult(result);
    location.href = 'result.html?quiz=' + encodeURIComponent(quiz.slug);
  }
})();
