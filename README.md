# Nihonggo Club

Latihan bahasa Jepang harian berbasis file JSON. Statis 100% — tanpa backend, tanpa database, tinggal taruh di GitHub Pages.

Satu halaman `quiz.html` melayani **semua** quiz, satu `print.html` melayani semua lembar soal, satu `certificate.html` melayani semua sertifikat. Menambah materi baru = menambah satu file JSON + satu baris di `data/manifest.json`.

---

## Struktur

```
.
├── index.html            # Beranda: daftar minggu/hari + progres
├── quiz.html             # Kerjakan quiz          → quiz.html?quiz=week1/day3-bunpou
├── result.html           # Hasil + pembahasan     → result.html?quiz=week1/day3-bunpou
├── certificate.html      # Sertifikat (A4 landscape)
├── print.html            # Lembar soal cetak (A4 potrait)
├── 404.html
│
├── css/
│   ├── style.css         # Token warna, tombol (gaya shadcn/ui), layout dasar
│   ├── home.css
│   ├── quiz.css
│   ├── result.css
│   ├── certificate.css
│   └── print.css
│
├── js/
│   ├── common.js         # Loader JSON, penilaian, localStorage, format tanggal
│   ├── proctor.js        # Mode ujian: layar penuh, anti-salin, pencatat pelanggaran
│   ├── app.js            # Beranda
│   ├── quiz.js
│   ├── result.js
│   ├── certificate.js
│   └── print.js
│
├── assets/
│   └── logo.svg
│
└── data/
    ├── manifest.json     # Daftar level → minggu → hari yang tampil di beranda
    └── n3/               # satu folder per level (baru ada N3)
        ├── week1/
        │   ├── day1-kotoba.json
        │   ├── day2-kanji.json
        │   └── day3-bunpou.json
        └── week2/
            └── day1-dokkai.json
```

Data disusun **level → minggu → hari**. Menambah level baru cukup membuat folder `data/n2/…` lalu mendaftarkannya di `manifest.json`; beranda otomatis menampilkan tab level baru.

## Alur

```
Beranda  →  Pilih level (N5–N1)  →  Daftar minggu & hari
                                          │
                                          ▼
                            quiz?quiz=…  →  result?quiz=…  ┬→ certificate?quiz=…
                                                           └→ print?quiz=…
```

Beranda punya dua tahap: kartu level dulu (N5, N4, N3, N2, N1), baru daftar latihan pada level itu. Level yang belum punya materi ditandai **Segera hadir**. Level aktif tersimpan di URL (`/?level=n3`), jadi bisa di-bookmark dan tombol *back* browser tetap jalan.

| Halaman | URL |
| --- | --- |
| Beranda (pilih level) | `/` |
| Beranda (isi satu level) | `/?level=n3` |
| Quiz | `/quiz?quiz=n3/week1/day3-bunpou` |
| Hasil | `/result?quiz=n3/week1/day3-bunpou` |
| Sertifikat | `/certificate?quiz=n3/week1/day3-bunpou` |
| Sertifikat (manual) | `/certificate?quiz=n3/week1/day3-bunpou&name=Thoriq&score=8&total=10&date=2026-07-29` |
| Lembar soal | `/print?quiz=n3/week1/day3-bunpou` |
| Lembar soal + kunci | `/print?quiz=n3/week1/day3-bunpou&key=1` |

`?quiz=` selalu berisi path relatif terhadap `data/` **tanpa** `.json`, yaitu `level/week/day`. Kalau halaman quiz/hasil/sertifikat/cetak dibuka tanpa `?quiz=`, halaman menampilkan daftar materi untuk dipilih — bukan error.

Soal penulisan URL:

* Garis miring pada slug **tidak** di-escape jadi `%2F`, jadi tautannya terbaca apa adanya: `quiz.html?quiz=n3/week1/day3-bunpou`. Ini sah menurut RFC 3986 — `/` boleh muncul di bagian query.
* Parser (`NC.quizSlug()`) menerima ketiga bentuk: `n3/week1/day3-bunpou`, `n3%2Fweek1%2Fday3-bunpou` (tautan lama), dan yang tak sengaja berakhiran `.json` atau berawalan `/`.
* Tautan dibuat **tanpa** `.html` (`quiz?quiz=…`). Ini jalan di `npx serve` dan GitHub Pages, yang sama-sama memetakan `/quiz` ke `quiz.html`. Kalau hosting-mu tidak memetakannya, ubah satu baris di [`js/common.js`](js/common.js):

  ```js
  var LINK_STYLE = 'html';   // semula 'clean'
  ```

  Semua tautan langsung berubah jadi `quiz.html?quiz=…`. File-nya sendiri tetap bernama `quiz.html`, jadi kedua bentuk URL selalu bisa diakses langsung.

---

## Menjalankan di lokal

Karena halaman membaca file JSON lewat `fetch`, membuka file HTML dengan klik dua kali (`file://`) akan diblokir browser. Jalankan server statis:

```bash
npx serve .
# atau
python -m http.server 8000
```

Lalu buka `http://localhost:3000` (atau `:8000`).

## Publikasi ke GitHub Pages

```bash
git init
git add .
git commit -m "Nihonggo Club: quiz platform"
git branch -M main
git remote add origin https://github.com/<username>/nihonggo-club.git
git push -u origin main
```

Lalu di GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.**

Situs tersedia di `https://<username>.github.io/nihonggo-club/` sekitar satu menit kemudian. Semua path di project ini relatif, jadi aman dijalankan dari sub-path repo.

---

## Menambah materi baru

**1. Buat file JSON**, misalnya `data/n3/week2/day2-kanji.json`.

**2. Daftarkan di `data/manifest.json`** pada level dan minggu yang sesuai:

```json
{
  "slug": "n3/week2/day2-kanji",
  "day": "Day 2",
  "title": "漢字",
  "subtitle": "Kanji tema pekerjaan",
  "tag": "漢字",
  "questions": 8,
  "points": 10,
  "passing": 7
}
```

Bentuk lengkap manifest-nya:

```json
{
  "brand": { "...": "..." },
  "levels": [
    {
      "id": "n3",
      "title": "N3",
      "subtitle": "Kelas menengah — JLPT N3",
      "weeks": [
        { "id": "week1", "title": "第1週", "subtitle": "Week 1 · Dasar N3", "days": [ ... ] }
      ]
    }
  ]
}
```

`id` level dipakai sebagai nama folder **dan** awalan slug (`n3/…`). Menambah level baru = buat folder `data/n2/`, tambahkan satu objek level di `levels`. Tidak ada kode HTML/JS yang perlu diubah.

## Format file quiz

```json
{
  "id": "n3-week1-day3-bunpou",
  "title": "第1週-3日目（文法）",
  "description": "JLPT N3 Grammar Practice",
  "level": "N3",
  "passingScore": 6,
  "totalQuestions": 8,
  "collectName": true,
  "questions": [ ... ]
}
```

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `title` | ya | Judul yang tampil di quiz, hasil, dan sertifikat |
| `description` | – | Subjudul |
| `level` | – | Badge level pada halaman quiz & lembar cetak (mis. `N3`) |
| `passingScore` | – | Batas lulus dalam **poin**. Default: 60% dari total poin |
| `collectName` | – | `false` untuk menyembunyikan input nama |
| `proctor` | – | `false` untuk mematikan mode ujian (layar penuh & anti-salin) |
| `questions` | ya | Daftar soal |

### Tipe soal

**`multiple-choice`** — `answer` adalah nomor opsi (mulai dari 1).

```json
{
  "id": 1,
  "section": "問題１",
  "type": "multiple-choice",
  "points": 1,
  "context": "kalimat panjang yang memuat nomor soal (opsional)",
  "question": "ていねいに話さないと、こども（　　　　）よ",
  "options": ["みたいだ", "らしい", "そう", "よう"],
  "answer": 3,
  "explanation": "Muncul di halaman pembahasan (opsional)"
}
```

**`order`** — soal susun kalimat; `answer` adalah nomor opsi yang menempati posisi ★.

```json
{
  "id": 5,
  "section": "問題２",
  "type": "order",
  "points": 1,
  "instruction": "★に入るものを選びなさい。",
  "sentence": "________ ________ ________ ____★____ でした。",
  "options": ["あたたかい", "春らしい", "日", "今日は"],
  "answer": 3
}
```

**`text`** — isian singkat; `answer` boleh berupa string atau daftar jawaban yang diterima. Perbandingan mengabaikan huruf besar/kecil dan spasi.

```json
{
  "id": 8,
  "type": "text",
  "points": 2,
  "question": "「明日」の　よみかたを　ひらがなで　書きなさい。",
  "answer": ["あした", "あす"]
}
```

**Bacaan (読解)** — tambahkan `passage` pada soal pertama dari satu kelompok bacaan. Teks bacaan hanya dirender sekali selama isinya sama.

```json
{
  "id": 1,
  "section": "問題１　文章を読んで、質問に答えなさい。",
  "passage": "わたしは　毎週　土曜日に……",
  "question": "この　クラブは　いつ　ありますか。",
  "options": ["…", "…", "…", "…"],
  "answer": 2
}
```

### Field per soal

| Field | Keterangan |
| --- | --- |
| `id` | Nomor unik dalam satu file (default: urutan) |
| `section` | Judul kelompok, mis. `問題１`. Soal dengan section sama dikelompokkan |
| `points` | Bobot nilai (default `1`) |
| `question` | Teks pertanyaan |
| `context` | Kotak kalimat/paragraf pendek di atas pertanyaan |
| `passage` | Kotak bacaan panjang, dirender sekali per kelompok |
| `instruction` | Instruksi kecil (dipakai tipe `order`) |
| `sentence` | Kalimat berpola untuk tipe `order` |
| `options` | Daftar pilihan |
| `answer` | Nomor opsi benar (1-based) atau string/array untuk tipe `text` |
| `explanation` | Pembahasan di halaman hasil |

---

## Mode ujian

Halaman quiz dibuka dengan layar mulai (gate): nama peserta, daftar aturan, dan tombol besar **Mulai & masuk layar penuh**. Soal baru dirender setelah layar penuh aktif — jadi tidak bisa dibaca sebelum ujian dimulai.

Selama ujian berjalan:

| Kejadian | Perlakuan |
| --- | --- |
| Keluar dari layar penuh (Esc/F11) | Ujian dijeda, seluruh konten diburamkan, muncul tombol kembali |
| Pindah tab / minimize | Dijeda + dicatat sebagai pelanggaran |
| Jendela kehilangan fokus (alt-tab) | Konten diburamkan, **tidak** dihitung pelanggaran |
| Blok teks, klik kanan, drag, Ctrl+C/X/A | Diblokir + dicatat |
| Ctrl+P / Ctrl+S / PrintScreen | Diblokir, clipboard ditimpa, halaman kosong saat dicetak |

Jumlah pelanggaran tampil real-time di bar atas soal, ikut tersimpan bersama hasil, dan muncul sebagai blok **integritas** di halaman hasil.

Matikan mode ujian per materi lewat file JSON-nya:

```json
{ "proctor": false }
```

**Batasnya perlu jujur:** semua penjagaan ini berjalan di browser peserta, jadi sifatnya pencegah, bukan pengaman. Peserta yang paham DevTools tetap bisa melewatinya, dan tangkapan layar lewat aplikasi OS (Win+Shift+S, tombol screenshot HP, kamera ponsel) tidak bisa dicegah oleh halaman web mana pun. Yang bisa diandalkan adalah pencatatannya — pelanggaran terekam di hasil.

## Sertifikat

* Terbit otomatis bila `score >= passingScore`; jika belum, halaman menampilkan status terkunci beserta selisih poinnya.
* Nomor sertifikat dibuat otomatis dengan pola `NC-N3W1D3-20260729-001` (level · minggu/hari · tanggal · percobaan ke-n).
* Ukuran **A4 landscape**. Saat `Ctrl + P`: pilih A4, orientasi Landscape, dan aktifkan **Background graphics**.
* Nama penanda tangan dan penerbit diatur di `data/manifest.json` → `brand.issuer`, `brand.signerName`, `brand.signerRole`.

## Progres

Skor, riwayat, dan nama peserta disimpan di `localStorage` browser masing-masing (kunci `nc:*`). Tidak ada data yang dikirim ke server. Tombol **Reset progres** di beranda menghapus semuanya.

## Warna & komponen

Palet biru didefinisikan sebagai CSS variable di `css/style.css` (`--alice-blue` … `--cobalt-blue`). Tombol memakai konvensi shadcn/ui:

```html
<button class="btn btn--primary">…</button>
<button class="btn btn--secondary btn--sm">…</button>
<a class="btn btn--outline">…</a>
<button class="btn btn--ghost">…</button>
<button class="btn btn--destructive btn--lg">…</button>
```

Varian: `--primary`, `--secondary`, `--outline`, `--ghost`, `--destructive`, `--link`. Ukuran: `--sm`, (default), `--lg`, `--icon`, `--block`.

---

Nihonggo Club adalah kelas latihan mandiri — bukan lembaga penyelenggara ujian resmi, dan sertifikatnya bukan sertifikat JLPT.
