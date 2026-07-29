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
    ├── manifest.json     # Daftar minggu & hari yang tampil di beranda
    ├── week1/
    │   ├── day1-kotoba.json
    │   ├── day2-kanji.json
    │   └── day3-bunpou.json
    └── week2/
        └── day1-dokkai.json
```

## Alur

```
index.html  →  quiz.html?quiz=…  →  result.html?quiz=…  ┬→ certificate.html?quiz=…
                                                        └→ print.html?quiz=…
```

| Halaman | URL |
| --- | --- |
| Beranda | `/` |
| Quiz | `/quiz.html?quiz=week1/day3-bunpou` |
| Hasil | `/result.html?quiz=week1/day3-bunpou` |
| Sertifikat | `/certificate.html?quiz=week1/day3-bunpou` |
| Sertifikat (manual) | `/certificate.html?quiz=week1/day3-bunpou&name=Thoriq&score=8&total=10&date=2026-07-29` |
| Lembar soal | `/print.html?quiz=week1/day3-bunpou` |
| Lembar soal + kunci | `/print.html?quiz=week1/day3-bunpou&key=1` |

`?quiz=` selalu berisi path relatif terhadap `data/` **tanpa** `.json`.

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

**1. Buat file JSON**, misalnya `data/week2/day2-kanji.json`.

**2. Daftarkan di `data/manifest.json`:**

```json
{
  "slug": "week2/day2-kanji",
  "day": "Day 2",
  "title": "漢字",
  "subtitle": "Kanji tema keluarga",
  "tag": "漢字",
  "level": "N4",
  "questions": 8,
  "points": 10,
  "passing": 7
}
```

Tidak ada kode HTML/JS yang perlu diubah.

## Format file quiz

```json
{
  "id": "week1-day3-bunpou",
  "title": "第1週-3日目（文法）",
  "description": "JLPT Grammar Practice",
  "level": "N4",
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
| `level` | – | Badge (N5, N4, …) |
| `passingScore` | – | Batas lulus dalam **poin**. Default: 60% dari total poin |
| `collectName` | – | `false` untuk menyembunyikan input nama |
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

## Sertifikat

* Terbit otomatis bila `score >= passingScore`; jika belum, halaman menampilkan status terkunci beserta selisih poinnya.
* Nomor sertifikat dibuat otomatis dengan pola `NC-W1D3-20260729-001` (kode minggu/hari · tanggal · percobaan ke-n).
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
