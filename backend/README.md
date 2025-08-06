## Struktur Folder Backend

```bash
├── api                            → Aplikasi utama Django, berisi semua logika backend
│   ├── admin.py                  
│   ├── apps.py                   
│   ├── migrations                → File migrasi database
│   │   ├── 0001_initial.py       → Migrasi awal, membuat struktur tabel awal
│   │   ├── 0002_remove_...py     → Perubahan struktur tabel dari versi sebelumnya
│   ├── models.py                 → Definisi struktur data (tabel database)
│   ├── permission.py             → Custom permission atau izin akses tiap role (superadmin/employee/kepalaBPS)
│   ├── serializers.py            → Mengatur cara data assignment, employee, dan dataset ditampilkan/dikirim lewat API
│   ├── services                 
│   │   ├── match_engine.py       → Mesin pencocokan data menggunakan FAISS/Fuzzy/XGBoost
│   │   └── supabase_service.py   → Integrasi layanan dengan Supabase
│   ├── signals.py                → Otomatisasi saat event terjadi, seperti setelah data disimpan
│   ├── tests.py                  → Unit test untuk memastikan fungsi berjalan sesuai
│   ├── urls.py                   → Routing endpoint untuk aplikasi ini
│   ├── utils                     
│   │   └── Upload_handler.py     → Fungsi menangani proses upload file
│   └── views                     → Endpoint API, terbagi berdasarkan fitur
│       ├── assignment_detail_views.py   → Detail penugasan individual
│       ├── assignment_views.py          → Manajemen penugasan
│       ├── auth_views.py                → Login dan otentikasi pengguna
│       ├── employee_labeling_views.py   → Labeling data karyawan
│       ├── employee_views.py            → Informasi karyawan
│       ├── file_views.py                → Upload dan delete table
│       ├── legacy_views.py              → Endpoint lama (untuk backward compatibility)
│       ├── matching_core_views.py       → Proses inti pencocokan
│       ├── matching_export_views.py     → Export hasil pencocokan
│       ├── matching_result_views.py     → Menampilkan hasil pencocokan
│       ├── table_views.py               → Menampilkan data dalam bentuk tabel
│       └── user_views.py                → Membuat user baru beserta role-nya (khusus untuk superadmin)
├── combined.json                → File JSON gabungan dari data hasil pre-processing
├── db.sqlite3                   → Database lokal berbasis SQLite
├── env                          → Virtual environment Python untuk proyek ini
│   ├── Include
│   ├── Lib
│   │   └── site-packages        → Semua dependensi Python diinstall di sini
│   ├── Scripts
├── exports                      → Folder output hasil pencocokan
│   ├── match_results_*.csv/xlsx → File hasil pencocokan dalam format CSV/XLSX
│   └── unmatch_results_*.xlsx   → Data yang tidak cocok dari proses matching
├── final_cleaned_output.xlsx    → Data hasil akhir yang sudah dibersihkan
├── manage.py                    → File utama untuk menjalankan perintah Django (runserver, migrate, dll)
├── matching_project             → Proyek konfigurasi utama Django
│   ├── asgi.py                  
│   ├── settings.py              → Semua pengaturan aplikasi Django (database, installed apps, dll)
│   ├── urls.py                  → URL routing global proyek Django
│   └── wsgi.py                 
├── requirements.txt             → Daftar dependensi Python yang dibutuhkan proyek
├── training_data.json           → Dataset pelatihan untuk model machine learning
└── xgb_model_faiss.json         → Model ML hasil training (XGBoost + FAISS)
```

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


