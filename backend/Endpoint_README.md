# Dokumentasi API Sistem Data Matching

**Base URL:** `http://127.0.0.1:8001`

Dokumentasi ini menjelaskan seluruh endpoint REST API yang tersedia pada sistem data matching, termasuk proses autentikasi, upload file, pengelolaan tabel, proses pencocokan otomatis, labeling manual, dan manajemen pengguna serta pegawai.

---

## 🔐 AUTENTIKASI

| Method | Endpoint   | Deskripsi                        |
|--------|------------|----------------------------------|
| POST   | /login/    | Login dan ambil token autentikasi |

---

## 📁 MANAJEMEN FILE

| Method      | Endpoint             | Deskripsi                           |
|-------------|----------------------|-------------------------------------|
| POST        | /upload/             | Mengunggah file                     |
| GET / DELETE| /table-operations/   | Mengambil atau menghapus tabel file |

---

## 📊 MANAJEMEN TABEL

| Method | Endpoint                          | Deskripsi                            |
|--------|-----------------------------------|--------------------------------------|
| GET    | /tables/                          | Menampilkan daftar semua tabel       |
| GET    | /tables/<table_name>/             | Detail tabel tertentu                |
| DELETE | /tables/<table_name>/             | Menghapus tabel tertentu             |
| DELETE | /tables/bulk/delete/              | Menghapus beberapa tabel sekaligus   |

---

## 🔍 INTI PROSES MATCHING

| Method | Endpoint                     | Deskripsi                                     |
|--------|------------------------------|-----------------------------------------------|
| GET    | /recommend-columns/          | Memberikan rekomendasi kolom yang cocok       |
| POST   | /prepare-combined/           | Menyiapkan penggabungan kolom                 |
| POST   | /start-matching/             | Memulai proses pencocokan                     |
| GET    | /matching-jobs/              | Menampilkan daftar proses matching            |
| GET    | /job-status/<job_id>/        | Melihat status dari job pencocokan tertentu   |
| GET    | /labeling-data/              | Mengambil data untuk pelabelan manual         |
| POST   | /submit-labeling/            | Mengirim hasil pelabelan manual               |
| POST   | /retrain-model/              | Melatih ulang model pencocokan                |

---

## 📈 HASIL MATCHING

| Method | Endpoint                                | Deskripsi                                          |
|--------|-----------------------------------------|----------------------------------------------------|
| GET    | /matching-results/                      | Menampilkan daftar hasil matching                  |
| GET    | /matching-stats/                        | Statistik hasil matching                           |
| GET    | /categorized-results/                   | Hasil matching yang telah dikategorikan            |
| GET    | /matching-summary/                      | Ringkasan hasil pencocokan                         |
| GET    | /categories/                            | Daftar kategori hasil pencocokan                   |
| GET    | /match-result-detail/<result_id>/       | Detail hasil pencocokan berdasarkan ID             |
| GET    | /all-results/                           | Menampilkan seluruh hasil matching (khusus admin)  |
| POST   | /export-categorized/                    | Mengekspor hasil matching yang sudah dikategorikan |
| POST   | /export-all/                            | Mengekspor semua hasil matching                    |

---

## 👥 MANAJEMEN PENGGUNA

| Method | Endpoint   | Deskripsi               |
|--------|------------|-------------------------|
| GET    | /users/    | Menampilkan semua pengguna |
| POST   | /users/    | Menambahkan pengguna baru |

---

## 📌 PENUGASAN (ASSIGNMENTS)

| Method        | Endpoint                                 | Deskripsi                                  |
|---------------|------------------------------------------|--------------------------------------------|
| GET / POST    | /assignments/                            | Menampilkan atau membuat assignment baru   |
| GET / PUT / DELETE | /assignments/<pk>/                  | Detail, edit, atau hapus assignment        |
| PATCH / PUT   | /assignments/<pk>/status/                | Memperbarui status assignment              |
| GET           | /assignments/<assignment_id>/progress/   | Menampilkan progres assignment             |

---

## 👨‍💼 MANAJEMEN PEGAWAI

| Method        | Endpoint                          | Deskripsi                                      |
|---------------|-----------------------------------|------------------------------------------------|
| GET / POST    | /employees/                       | Menampilkan atau menambah data pegawai         |
| GET / PUT / DELETE | /employees/<employee_id>/    | Detail, edit, atau hapus data pegawai          |
| POST          | /submit-batch-labeling/           | Mengirim hasil labeling dalam jumlah banyak    |

---

## 🧑‍💻 LABELING UNTUK PEGAWAI

| Method | Endpoint                         | Deskripsi                                 |
|--------|----------------------------------|-------------------------------------------|
| GET    | /my-assignments/                 | Menampilkan assignment milik pegawai      |
| GET    | /my-labeling-data/               | Mengambil data untuk pelabelan pegawai    |
| GET    | /my-assignment-status/           | Menampilkan status assignment pegawai     |

---

> 📌 **Catatan:** Pastikan menyertakan token autentikasi (Bearer Token) untuk mengakses endpoint yang membutuhkan otorisasi.

