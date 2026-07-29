/* ==========================================================================
   Nihonggo Club — shared helpers
   Dipakai oleh app.js, quiz.js, result.js, certificate.js, print.js
   ========================================================================== */
(function (global) {
  'use strict';

  var STORE = {
    result: function (slug) { return 'nc:result:' + slug; },
    progress: 'nc:progress',
    history: 'nc:history',
    name: 'nc:name'
  };

  var CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  var MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  /* --- Error dengan penjelasan ------------------------------------------ */
  function NCError(title, detail) {
    this.name = 'NCError';
    this.title = title;
    this.detail = detail || '';
    this.message = title;
  }
  NCError.prototype = Object.create(Error.prototype);

  /* --- Util ------------------------------------------------------------- */
  function param(name) {
    return new URLSearchParams(global.location.search).get(name);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function circled(n) {
    return CIRCLED[n - 1] || String(n);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /* --- Tanggal ---------------------------------------------------------- */
  function toDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      var p = value.split('-');
      return new Date(+p[0], +p[1] - 1, +p[2]);
    }
    return value ? new Date(value) : new Date();
  }

  function isoDate(value) {
    var d = toDate(value);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function dateID(value) {
    var d = toDate(value);
    return d.getDate() + ' ' + MONTH_ID[d.getMonth()] + ' ' + d.getFullYear();
  }

  function dateJP(value) {
    var d = toDate(value);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  /* --- Kode & nomor sertifikat ------------------------------------------ */
  function slugCode(slug) {
    var level = /^([a-z]+\d+)\//i.exec(slug || '');
    var wd = /week\s*(\d+)[/\-]day\s*(\d+)/i.exec(slug || '');
    var code = (level ? level[1].toUpperCase() : '') + (wd ? 'W' + wd[1] + 'D' + wd[2] : '');
    if (code) return code;
    return String(slug || 'QZ').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'QZ';
  }

  function certNumber(slug, date, seq) {
    return 'NC-' + slugCode(slug) + '-' + isoDate(date).replace(/-/g, '') +
      '-' + String(seq || 1).padStart(3, '0');
  }

  /* --- Memuat quiz ------------------------------------------------------ */
  function fileHint() {
    return global.location.protocol === 'file:'
      ? 'Halaman ini dibuka langsung dari folder (file://), sehingga browser memblokir pembacaan file JSON. ' +
        'Jalankan lewat server lokal — misalnya <code>npx serve .</code> atau <code>python -m http.server</code> — ' +
        'atau buka versi GitHub Pages-nya.'
      : '';
  }

  async function loadJSON(path) {
    var res;
    try {
      res = await fetch(path, { cache: 'no-cache' });
    } catch (e) {
      throw new NCError('Tidak bisa memuat ' + path, fileHint() || 'Periksa koneksi atau nama file.');
    }
    if (!res.ok) {
      throw new NCError('File tidak ditemukan (HTTP ' + res.status + ')', path);
    }
    try {
      return await res.json();
    } catch (e) {
      throw new NCError('Format JSON tidak valid', path + ' — ' + e.message);
    }
  }

  async function loadManifest() {
    return loadJSON('data/manifest.json');
  }

  /* Struktur manifest: levels[] -> weeks[] -> days[].
     Format lama (weeks[] di akar) tetap didukung. */
  function levels(manifest) {
    if (manifest && Array.isArray(manifest.levels)) return manifest.levels;
    if (manifest && Array.isArray(manifest.weeks)) {
      return [{ id: '', title: '', subtitle: '', weeks: manifest.weeks }];
    }
    return [];
  }

  function eachDay(manifest, fn) {
    levels(manifest).forEach(function (level) {
      (level.weeks || []).forEach(function (week) {
        (week.days || []).forEach(function (day) { fn(day, week, level); });
      });
    });
  }

  function findDay(manifest, slug) {
    var found = null;
    eachDay(manifest, function (day, week, level) {
      if (day.slug === slug) found = { day: day, week: week, level: level };
    });
    return found;
  }

  async function loadQuiz(slug) {
    if (!slug) {
      throw new NCError('Parameter ?quiz= belum diisi',
        'Contoh: <code>quiz.html?quiz=n3/week1/day3-bunpou</code>');
    }
    if (!/^[a-z0-9][a-z0-9._/-]*$/i.test(slug) || slug.indexOf('..') !== -1) {
      throw new NCError('Nama quiz tidak valid', esc(slug));
    }
    var quiz = await loadJSON('data/' + slug + '.json');
    return normalize(quiz, slug);
  }

  function normalize(quiz, slug) {
    if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) {
      throw new NCError('Soal kosong', 'File ' + slug + '.json tidak memiliki array "questions".');
    }
    quiz.slug = slug;
    quiz.title = quiz.title || slug;
    quiz.collectName = quiz.collectName !== false;
    quiz.questions.forEach(function (q, i) {
      q.id = q.id != null ? q.id : i + 1;
      q.type = q.type || 'multiple-choice';
      q.points = q.points || 1;
      q.section = q.section || '';
      q.options = Array.isArray(q.options) ? q.options : [];
    });
    quiz.totalPoints = quiz.questions.reduce(function (sum, q) { return sum + q.points; }, 0);
    quiz.totalQuestions = quiz.totalQuestions || quiz.questions.length;
    if (typeof quiz.passingScore !== 'number') {
      quiz.passingScore = Math.ceil(quiz.totalPoints * 0.6);
    }
    return quiz;
  }

  /* --- Penilaian -------------------------------------------------------- */
  function normText(s) {
    return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, '');
  }

  function isCorrect(q, given) {
    if (given == null || given === '') return false;
    if (q.type === 'text') {
      var accept = Array.isArray(q.answer) ? q.answer : [q.answer];
      return accept.some(function (a) { return normText(a) === normText(given); });
    }
    return Number(given) === Number(q.answer);
  }

  function grade(quiz, answers, name) {
    var details = quiz.questions.map(function (q) {
      var given = answers[q.id];
      var ok = isCorrect(q, given);
      return {
        id: q.id,
        section: q.section,
        type: q.type,
        question: q.question || q.sentence || '',
        context: q.context || '',
        passage: q.passage || '',
        instruction: q.instruction || '',
        sentence: q.sentence || '',
        options: q.options,
        given: given == null ? null : given,
        answer: q.answer,
        correct: ok,
        points: q.points,
        earned: ok ? q.points : 0,
        explanation: q.explanation || ''
      };
    });

    var order = [];
    var bySection = {};
    details.forEach(function (d) {
      var key = d.section || '—';
      if (!bySection[key]) { bySection[key] = { name: key, score: 0, total: 0, count: 0 }; order.push(key); }
      bySection[key].score += d.earned;
      bySection[key].total += d.points;
      bySection[key].count += 1;
    });

    var score = details.reduce(function (s, d) { return s + d.earned; }, 0);
    var total = quiz.totalPoints;
    var percent = total ? Math.round((score / total) * 100) : 0;

    return {
      slug: quiz.slug,
      title: quiz.title,
      description: quiz.description || '',
      name: (name || '').trim(),
      score: score,
      total: total,
      percent: percent,
      passingScore: quiz.passingScore,
      passingPercent: total ? Math.round((quiz.passingScore / total) * 100) : 0,
      passed: score >= quiz.passingScore,
      correctCount: details.filter(function (d) { return d.correct; }).length,
      questionCount: details.length,
      sections: order.map(function (k) { return bySection[k]; }),
      details: details,
      date: isoDate(new Date()),
      at: new Date().toISOString()
    };
  }

  /* --- Penyimpanan ------------------------------------------------------ */
  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* mode privat */ }
  }

  function getProgress() { return read(STORE.progress, {}) || {}; }
  function getHistory() { return read(STORE.history, []) || []; }
  function getResult(slug) { return read(STORE.result(slug), null); }
  function getName() { return read(STORE.name, '') || ''; }
  function setName(name) { write(STORE.name, name || ''); }

  function saveResult(result) {
    var history = getHistory();
    var seq = history.filter(function (h) { return h.slug === result.slug; }).length + 1;
    result.seq = seq;
    result.certNumber = certNumber(result.slug, result.date, seq);

    write(STORE.result(result.slug), result);

    history.push({
      slug: result.slug, title: result.title, name: result.name,
      score: result.score, total: result.total, percent: result.percent,
      passed: result.passed, date: result.date, at: result.at
    });
    write(STORE.history, history.slice(-200));

    var progress = getProgress();
    var prev = progress[result.slug];
    progress[result.slug] = {
      name: result.name,
      score: result.score,
      total: result.total,
      percent: result.percent,
      passed: result.passed,
      date: result.date,
      attempts: (prev && prev.attempts ? prev.attempts : 0) + 1,
      best: Math.max(prev && prev.best != null ? prev.best : 0, result.percent)
    };
    write(STORE.progress, progress);
    if (result.name) setName(result.name);
    return result;
  }

  function resetProgress() {
    var progress = getProgress();
    Object.keys(progress).forEach(function (slug) {
      try { global.localStorage.removeItem(STORE.result(slug)); } catch (e) { /* noop */ }
    });
    try {
      global.localStorage.removeItem(STORE.progress);
      global.localStorage.removeItem(STORE.history);
    } catch (e) { /* noop */ }
  }

  /* --- Pemilih materi (dipakai saat ?quiz= kosong) ---------------------- */
  async function renderPicker(el, opts) {
    if (!el) return;
    opts = opts || {};
    var page = opts.page || 'quiz.html';
    var manifest;
    try {
      manifest = await loadManifest();
    } catch (err) {
      renderError(el, err);
      return;
    }

    var groups = [];
    levels(manifest).forEach(function (level) {
      (level.weeks || []).forEach(function (week) {
        var days = (week.days || []).filter(function (d) { return d && d.slug; });
        if (!days.length) return;
        groups.push({
          label: [level.title || level.id, week.title || week.id].filter(Boolean).join(' · '),
          sub: week.subtitle || '',
          days: days
        });
      });
    });

    if (!groups.length) {
      renderError(el, new NCError('Belum ada materi',
        'Tambahkan level, minggu, dan hari pada <code>data/manifest.json</code>.'));
      return;
    }

    el.innerHTML =
      '<div class="picker-head">' +
        '<h1>' + esc(opts.title || 'Pilih materi') + '</h1>' +
        '<p>' + (opts.desc || '') + '</p>' +
      '</div>' +
      groups.map(function (g) {
        return '<section class="picker-group">' +
          '<div class="picker-group__head">' +
            '<span class="jp">' + esc(g.label) + '</span>' +
            (g.sub ? '<span class="picker-group__sub">' + esc(g.sub) + '</span>' : '') +
          '</div>' +
          g.days.map(function (d) {
            return '<a class="picker-item" href="' + page + '?quiz=' + encodeURIComponent(d.slug) + '">' +
              '<span class="badge badge--brand">' + esc(d.day || '—') + '</span>' +
              '<span class="picker-item__text">' +
                '<b class="jp">' + esc(d.title || d.slug) + '</b>' +
                (d.subtitle ? '<span>' + esc(d.subtitle) + '</span>' : '') +
              '</span>' +
              (d.tag ? '<span class="badge jp">' + esc(d.tag) + '</span>' : '') +
              '<span class="picker-item__go" aria-hidden="true">→</span>' +
            '</a>';
          }).join('') +
        '</section>';
      }).join('');
  }

  /* --- Render error ----------------------------------------------------- */
  function renderError(el, err) {
    if (!el) return;
    var title = err && err.title ? err.title : 'Terjadi kesalahan';
    var detail = err && err.detail ? err.detail : (err && err.message ? esc(err.message) : '');
    el.innerHTML =
      '<div class="state state--error">' +
        '<div class="state__title">' + esc(title) + '</div>' +
        '<div class="state__desc">' + detail + '</div>' +
        '<a class="btn btn--outline" href="index.html">Kembali ke beranda</a>' +
      '</div>';
  }

  global.NC = {
    STORE: STORE,
    NCError: NCError,
    param: param,
    esc: esc,
    circled: circled,
    clamp: clamp,
    isoDate: isoDate,
    dateID: dateID,
    dateJP: dateJP,
    slugCode: slugCode,
    certNumber: certNumber,
    loadJSON: loadJSON,
    loadManifest: loadManifest,
    loadQuiz: loadQuiz,
    levels: levels,
    eachDay: eachDay,
    findDay: findDay,
    grade: grade,
    isCorrect: isCorrect,
    getProgress: getProgress,
    getHistory: getHistory,
    getResult: getResult,
    getName: getName,
    setName: setName,
    saveResult: saveResult,
    resetProgress: resetProgress,
    renderPicker: renderPicker,
    renderError: renderError
  };
})(window);
