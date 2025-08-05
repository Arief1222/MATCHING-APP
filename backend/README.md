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
