# 🧩 MATCHING-APP

MATCHING-APP adalah aplikasi web untuk **mendeteksi duplikasi data** dan **mencocokkan entitas** dari dua sumber dataset yang berbeda. Sistem ini mendukung proses **matching otomatis** menggunakan FAISS, Fuzzy Matching, dan XGBoost, serta menyediakan fitur **labeling manual** untuk meningkatkan akurasi melalui data teranotasi.

---

## 🎯 Tujuan

Aplikasi ini dikembangkan untuk:
- Menghapus data duplikat antar sumber dataset
- Menyatukan entitas yang sama namun tersebar di dua dataset berbeda
- Melengkapi kolom data yang hilang dengan hasil pencocokan
- Menyediakan antarmuka labeling untuk model pembelajaran mesin

---

## 👤 Peran Pengguna

- **Superadmin:** Membuat akun employee, mengatur tugas labeling
- **Employee:** Melakukan labeling pada data yang belum pasti
- **Kepala BPS:** Hanya dapat melihat hasil pencocokan

---

## ⚙️ Teknologi yang Digunakan

- [React.js](https://reactjs.org/)
- [Supabase](https://supabase.com/) (self-hosted via Docker)
- [Django (Python)](https://www.djangoproject.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [XGBoost](https://xgboost.readthedocs.io/)
- FAISS, FuzzyWuzzy untuk matching

---

## 🚀 Fitur Utama

- ✅ Upload dua file dataset (A & B)
- 🤖 Matching otomatis (FAISS, Fuzzy Matching, XGBoost)
- 🧠 Labeling data ambigu oleh employee
- 📊 Kolom rekomendasi hasil pencocokan
- 🛠️ Training model XGBoost berbasis hasil labeling
- 👥 Role-based access control

---

## 💻 Cara Menjalankan

### 1. Clone Repo
```bash
git clone https://github.com/Arief1222/MATCHING-APP.git
cd MATCHING-APP
