# Struktur Folder Frontend
```bash
├── README.md                        
├── eslint.config.js                 ← Konfigurasi linting JavaScript (ESLint)
├── index.html                       ← Template HTML utama, digunakan Vite saat build
├── node_modules                     ←  Folder dependency 
├── package-lock.json                ← File lock dependencies (auto-generated oleh npm)
├── package.json                     ← Metadata proyek, dependencies, dan script npm
├── public                           ← Folder untuk aset statis (tidak diproses oleh Vite)
├── src                              ← Folder utama source code frontend React
│   ├── App.css                      ← Styling untuk komponen `App`
│   ├── App.jsx                      ← Root komponen React yang merender seluruh aplikasi
│   ├── assets                       
│   │   ├── image.png                
│   │   └── react.svg                
│   ├── components                   ← Komponen UI yang dapat digunakan ulang
│   │   ├── ColumnSelector.jsx       ← Komponen untuk memilih kolom dari tabel
│   │   ├── Header.jsx               ← Komponen header/navigation bar
│   │   ├── JobHistoryTable.jsx      ← Komponen untuk menampilkan riwayat pekerjaan
│   │   ├── MatchResultTable.jsx     ← Komponen untuk hasil pencocokan data
│   │   ├── MatchingTypeSelector.jsx ← Komponen pemilih jenis matching
│   │   ├── RecommendedColumns.jsx   ← Menampilkan kolom yang direkomendasikan
│   │   ├── TableSelector.jsx        ← Komponen pemilih tabel
│   │   ├── UploadFile.jsx           ← Komponen upload file ke backend
│   │   └── sidebar.jsx              ← Sidebar navigasi/menu samping
│   ├── hooks                        ← Folder untuk custom React hooks
│   │   └── useMatchingLogic.js      ← Hook khusus untuk logika pencocokan (matching)
│   ├── index.css                    ← CSS global untuk aplikasi
│   ├── main.jsx                     ← Entry point aplikasi React, mounting `App.jsx` ke DOM
│   └── pages                        ← Halaman utama aplikasi (dihubungkan oleh router)
│       ├── AssignmentPage.jsx       ← Halaman untuk mengelola assignment
│       ├── EmployeeLabelingPage.jsx← Halaman untuk labeling oleh karyawan
│       ├── LabelingPage.jsx         ← Halaman untuk proses labeling data
│       ├── LoginPage.jsx            ← Halaman login user
│       ├── MatchPage.jsx            ← Halaman untuk hasil match data
│       ├── MatchingPage.jsx         ← Halaman proses matching
│       ├── TablesPage.jsx           ← Halaman menampilkan tabel-tabel dataset
│       ├── UnmatchPage.jsx          ← Halaman untuk data yang tidak ter-match
│       └── UploadPage.jsx           ← Halaman upload data/tabel baru
├── vite.config.js                  ← Konfigurasi build dan plugin untuk Vite
```
