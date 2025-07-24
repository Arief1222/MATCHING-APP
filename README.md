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

## 💻 Cara Menjalankan MATCHING-APP Secara Lokal

Ikuti langkah-langkah berikut untuk menjalankan aplikasi secara lokal di lingkungan pengembangan:

---

### 1. Clone Repository

```bash
git clone https://github.com/Arief1222/MATCHING-APP.git
cd MATCHING-APP
```

---

### 2. Menjalankan Frontend (React.js)

```bash
cd frontend
npm install
npm run dev
```

---

### 3. Menjalankan Backend (Django)

#### a. Buat dan Aktifkan Virtual Environment

```bash
cd ../backend
python -m venv env
```

Aktifkan virtual environment:

* **Linux / macOS**:

  ```bash
  source env/bin/activate
  ```

* **Windows**:

  ```bash
  env\Scripts\activate
  ```

#### b. Install Dependencies

```bash
pip install -r requirements.txt
```

#### c. Jalankan Server Django

```bash
python manage.py runserver 127.0.0.1:8001
```

---

### 4. Menjalankan Supabase (Self-hosted)

```bash
cd ../supabase-project
docker compose pull         # Menarik semua image Supabase
docker compose up -d        # Menjalankan Supabase di background
```

Untuk menghentikan Supabase:

```bash
docker compose down
```

---

### 5. Login ke Supabase Studio

Gunakan **username dan password default** sesuai dokumentasi Supabase:

📖 [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting/docker)
