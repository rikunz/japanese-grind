/* ==========================================================================
   Nihonggo Club — halaman quiz
   Alur: gate (nama + aturan) → layar penuh → soal → kumpulkan → hasil
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var overlay = document.getElementById('examOverlay');
  var slug = NC.param('quiz');

  var quiz = null;
  var answers = {};
  var name = '';
  var submitted = false;
  var proctor = null;
  var examMode = true;

  var ICON_FULLSCREEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';

  init();

  async function init() {
    if (!slug) {
      document.getElementById('printLink').classList.add('hidden');
      NC.renderPicker(app, {
        page: 'quiz.html',
        title: 'Pilih materi latihan',
        desc: 'Halaman quiz dibuka tanpa parameter <code>?quiz=</code>. Pilih salah satu materi di bawah ini.'
      });
      return;
    }
    document.getElementById('printLink').href = 'print.html?quiz=' + encodeURIComponent(slug);

    try {
      quiz = await NC.loadQuiz(slug);
    } catch (err) {
      NC.renderError(app, err);
      return;
    }
    document.title = quiz.title + ' — Nihonggo Club';
    examMode = quiz.proctor !== false;
    renderGate();
  }

  /* --- Layar mulai ------------------------------------------------------ */
  function renderGate() {
    var rules = examMode
      ? ['Ujian berjalan dalam <b>layar penuh</b>. Keluar dari layar penuh akan menjeda ujian.',
         'Menyalin, klik kanan, dan mencetak soal dinonaktifkan.',
         'Pindah tab atau jendela lain <b>tercatat</b> sebagai pelanggaran.',
         'Konten otomatis diburamkan saat jendela ini tidak aktif.',
         'Tidak ada batas waktu — soal kosong dihitung salah.']
      : ['Tidak ada batas waktu.', 'Soal kosong dihitung salah.',
         'Hasil dan pembahasan muncul setelah dikumpulkan.'];

    app.innerHTML =
      '<div class="gate">' +
        '<div class="gate__tags">' +
          (quiz.level ? '<span class="badge badge--brand">' + NC.esc(quiz.level) + '</span>' : '') +
          '<span class="badge badge--muted">' + quiz.questions.length + ' soal</span>' +
          '<span class="badge badge--muted">' + quiz.totalPoints + ' poin</span>' +
          '<span class="badge badge--muted">Lulus ≥ ' + quiz.passingScore + '</span>' +
          (examMode ? '<span class="badge badge--fail">Mode ujian</span>' : '') +
        '</div>' +
        '<h1>' + NC.esc(quiz.title) + '</h1>' +
        (quiz.description ? '<p class="gate__desc">' + NC.esc(quiz.description) + '</p>' : '') +

        (quiz.collectName ?
        '<div class="gate__field">' +
          '<label class="field">' +
            '<span class="field__label">Nama peserta</span>' +
            '<input class="input" id="playerName" type="text" autocomplete="name" maxlength="60" ' +
              'placeholder="Tulis nama lengkap kamu" value="' + NC.esc(NC.getName()) + '">' +
          '</label>' +
          '<p class="field__hint">Nama ini dipakai pada halaman hasil dan sertifikat.</p>' +
        '</div>' : '') +

        '<div class="gate__error" id="gateError"></div>' +

        '<div class="gate__rules">' +
          '<div class="gate__rules-title">' + (examMode ? 'Aturan ujian' : 'Ketentuan') + '</div>' +
          '<ul>' + rules.map(function (r) { return '<li><span>' + r + '</span></li>'; }).join('') + '</ul>' +
        '</div>' +

        '<button type="button" class="btn btn--primary btn--xl" id="startBtn">' +
          (examMode ? ICON_FULLSCREEN + 'Mulai &amp; masuk layar penuh' : 'Mulai latihan') +
        '</button>' +

        (examMode
          ? '<p class="gate__note">Soal baru ditampilkan setelah layar penuh aktif.</p>'
          : '') +
      '</div>';

    document.getElementById('startBtn').addEventListener('click', startExam);
    var nameInput = document.getElementById('playerName');
    if (nameInput) {
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); startExam(); }
      });
    }
  }

  function gateError(html) {
    var box = document.getElementById('gateError');
    if (!box) return;
    box.innerHTML = html;
    box.classList.add('is-visible');
  }

  /* --- Mulai ------------------------------------------------------------ */
  function startExam() {
    var nameInput = document.getElementById('playerName');
    if (quiz.collectName) {
      name = nameInput.value.trim();
      if (!name) {
        gateError('Nama wajib diisi sebelum mulai.');
        nameInput.classList.add('input--invalid');
        nameInput.focus();
        return;
      }
      nameInput.classList.remove('input--invalid');
      NC.setName(name);
    }

    if (!examMode) { openQuiz(); return; }

    proctor = NC.createProctor({
      onState: onExamState,
      onViolation: function (type) {
        if (type === 'copy' || type === 'capture') flashBar();
      }
    });

    proctor.start().then(openQuiz).catch(function (err) {
      gateError('<b>Layar penuh gagal diaktifkan.</b><br>' + NC.esc(err && err.message ? err.message : '') +
        ' Coba klik tombolnya lagi, atau lanjut tanpa layar penuh — statusnya akan dicatat di hasil.' +
        '<br><br><button type="button" class="btn btn--outline btn--sm" id="startNoFs">Lanjut tanpa layar penuh</button>');
      var fallback = document.getElementById('startNoFs');
      if (fallback) {
        fallback.addEventListener('click', function () {
          proctor = NC.createProctor({ enforce: false, onState: onExamState });
          proctor.start().then(openQuiz);
        });
      }
    });
  }

  function openQuiz() {
    render();
    bind();
    updateExamBar();
  }

  /* --- Render soal ------------------------------------------------------ */
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
      (examMode ?
      '<div class="exam-bar">' +
        '<span class="exam-bar__dot"></span>' +
        '<span>Mode ujian aktif' + (name ? ' · ' + NC.esc(name) : '') + '</span>' +
        '<span class="exam-bar__count" id="examBarCount">0 pelanggaran</span>' +
      '</div>' : '') +

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
      answers[input.dataset.qid] = input.value;

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

  /* --- Mode ujian ------------------------------------------------------- */
  function onExamState(state) {
    updateExamBar(state.counts);
    if (!state.running) { overlay.hidden = true; return; }

    if (state.paused) {
      showOverlay(state);
    } else {
      overlay.hidden = true;
    }
  }

  function showOverlay(state) {
    var isTab = state.reason === 'tab';
    document.getElementById('examTitle').textContent = isTab
      ? 'Kamu meninggalkan halaman ujian'
      : 'Ujian dijeda';
    document.getElementById('examDesc').textContent = isTab
      ? 'Berpindah tab atau jendela tercatat sebagai pelanggaran. Kembali ke layar penuh untuk melanjutkan.'
      : 'Ujian harus dikerjakan dalam layar penuh. Klik tombol di bawah untuk melanjutkan.';
    document.getElementById('examLog').innerHTML = logRows(state.counts);
    overlay.hidden = false;
    document.getElementById('examResume').focus();
  }

  function logRows(counts) {
    var rows = Object.keys(counts)
      .filter(function (k) { return counts[k] > 0; })
      .map(function (k) {
        return '<li><span>' + NC.PROCTOR_LABELS[k] + '</span><b>' + counts[k] + '×</b></li>';
      });
    return rows.length ? rows.join('') : '<li class="exam-log--clean">Belum ada pelanggaran tercatat.</li>';
  }

  function updateExamBar(counts) {
    var el = document.getElementById('examBarCount');
    if (!el) return;
    var total = counts
      ? Object.keys(counts).reduce(function (n, k) { return n + counts[k]; }, 0)
      : (proctor ? proctor.summary().total : 0);
    el.textContent = total + ' pelanggaran';
    el.classList.toggle('is-warn', total > 0);
  }

  function flashBar() {
    var el = document.getElementById('examBarCount');
    if (!el) return;
    el.classList.add('is-warn');
  }

  document.getElementById('examResume').addEventListener('click', function () {
    if (proctor) proctor.resume().catch(function () { /* pengguna menolak */ });
  });

  document.getElementById('examQuit').addEventListener('click', function () {
    if (!confirm('Keluar dari ujian? Jawaban yang sudah diisi tidak disimpan.')) return;
    submitted = true;
    var done = proctor ? proctor.stop() : Promise.resolve();
    done.then(function () { location.href = 'index.html'; });
  });

  /* --- Kumpulkan -------------------------------------------------------- */
  function submit() {
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
    if (proctor) result.proctor = proctor.summary();
    NC.saveResult(result);

    var done = proctor ? proctor.stop() : Promise.resolve();
    done.then(function () {
      location.href = 'result.html?quiz=' + encodeURIComponent(quiz.slug);
    });
  }
})();
