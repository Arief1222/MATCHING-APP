🟢 Base URL: http://127.0.0.1:8001

📦 AUTH
Method	Endpoint	URL Lengkap	Keterangan
POST	/login/	http://127.0.0.1:8001/login/	Login dan ambil token

📁 FILES
Method	Endpoint	URL Lengkap	Keterangan
POST	/upload/	http://127.0.0.1:8001/upload/	Upload file
GET / DELETE	/table-operations/	http://127.0.0.1:8001/table-operations/	Get / Delete table

 📊 TABLE MANAGEMENT
Method	Endpoint	URL Lengkap	Keterangan
GET	/tables/	http://127.0.0.1:8001/tables/	List tabel yang tersedia
GET / DELETE	/tables/<table_name>/	http://127.0.0.1:8001/tables/<table_name>/	Detail / Hapus tabel tertentu
DELETE	/tables/bulk/delete/	http://127.0.0.1:8001/tables/bulk/delete/	Bulk delete tabel

✅ 🔍 MATCHING CORE
Method	Endpoint	URL Lengkap	Keterangan
GET	/recommend-columns/	http://127.0.0.1:8001/recommend-columns/	Rekomendasi kolom
POST	/prepare-combined/	http://127.0.0.1:8001/prepare-combined/	Persiapan penggabungan kolom
POST	/start-matching/	http://127.0.0.1:8001/start-matching/	Mulai proses matching
GET	/matching-jobs/	http://127.0.0.1:8001/matching-jobs/	List job matching
GET	/job-status/<job_id>/	http://127.0.0.1:8001/job-status/<job_id>/	Status job tertentu
GET	/labeling-data/	http://127.0.0.1:8001/labeling-data/	Ambil data untuk labeling
POST	/submit-labeling/	http://127.0.0.1:8001/submit-labeling/	Submit hasil labeling
POST	/retrain-model/	http://127.0.0.1:8001/retrain-model/	Retrain model

✅ 📈 MATCHING RESULT
Method	Endpoint	URL Lengkap	Keterangan
GET	/matching-results/	http://127.0.0.1:8001/matching-results/	List hasil matching
GET	/matching-stats/	http://127.0.0.1:8001/matching-stats/	Statistik hasil matching
GET	/categorized-results/	http://127.0.0.1:8001/categorized-results/	Hasil yang telah dikategorikan
GET	/matching-summary/	http://127.0.0.1:8001/matching-summary/	Ringkasan hasil matching
GET	/categories/	http://127.0.0.1:8001/categories/	Kategori hasil matching
GET	/match-result-detail/<result_id>/	http://127.0.0.1:8001/match-result-detail/<result_id>/	Detail hasil matching berdasarkan ID
GET	/all-results/	http://127.0.0.1:8001/all-results/	Semua hasil matching (admin)
POST	/export-categorized/	http://127.0.0.1:8001/export-categorized/	Export hasil ter-kategori
POST	/export-all/	http://127.0.0.1:8001/export-all/	Export semua hasil

✅ 👥 USER MANAGEMENT
Method	Endpoint	URL Lengkap	Keterangan
GET	/users/	http://127.0.0.1:8001/users/	List semua user
POST	/users/	http://127.0.0.1:8001/users/	Tambah user baru

✅ 📌 ASSIGNMENTS
Method	Endpoint	URL Lengkap	Keterangan
GET / POST	/assignments/	http://127.0.0.1:8001/assignments/	List dan buat assignment baru
GET / PUT / DELETE	/assignments/<pk>/	http://127.0.0.1:8001/assignments/<pk>/	Detail / Edit / Hapus assignment
PATCH / PUT	/assignments/<pk>/status/	http://127.0.0.1:8001/assignments/<pk>/status/	Update status assignment
GET	/assignments/<assignment_id>/progress/	http://127.0.0.1:8001/assignments/<assignment_id>/progress/	Progress assignment oleh pegawai

✅ 👨‍💼 EMPLOYEES
Method	Endpoint	URL Lengkap	Keterangan
GET / POST	/employees/	http://127.0.0.1:8001/employees/	List dan buat data pegawai
GET / PUT / DELETE	/employees/<employee_id>/	http://127.0.0.1:8001/employees/<employee_id>/	Detail / Edit / Hapus pegawai
POST	/submit-batch-labeling/	http://127.0.0.1:8001/submit-batch-labeling/	Submit batch labeling (pegawai)

✅ 🧑‍💻 EMPLOYEE-SIDE LABELING
Method	Endpoint	URL Lengkap	Keterangan
GET	/my-assignments/	http://127.0.0.1:8001/my-assignments/	List assignment untuk pegawai
GET	/my-labeling-data/	http://127.0.0.1:8001/my-labeling-data/	Data labeling pegawai
GET	/my-assignment-status/	http://127.0.0.1:8001/my-assignment-status/	Status assignment pegawai

