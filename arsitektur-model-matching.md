# 🔍 Matching Engine with FAISS, Fuzzy Matching, and XGBoost

Sistem ini merupakan pipeline pencocokan data yang menggabungkan pendekatan *semantic vector search* (FAISS), *text similarity* (Fuzzy Matching), dan *machine learning* (XGBoost) untuk menghasilkan prediksi kecocokan antar entitas (misal: nama perusahaan, produk, dsb).

---

## 🧠 Arsitektur Matching Engine

<p align="center">
  <img src="https://github.com/user-attachments/assets/cc7ad658-330d-4cff-8c10-468dee3d5b1e" alt="Matching Flow Diagram" width="500"/>
</p>

---

## 📦 Modul dan Alur Kerja

### 1. 🗃️ Data Layer

- **Supabase Service**  
  Mengambil data input (record) dan mapping dari Supabase (PostgreSQL).

- **Preprocessing**  
  Menggabungkan beberapa kolom menjadi satu string yang akan digunakan sebagai input untuk model embedding.

---

### 2. ⚙️ Matching Engine

- **Vectorization**  
  Mengubah string menjadi representasi vektor menggunakan `SentenceTransformer`.

- **FAISS Search**  
  Menggunakan FAISS untuk mencari kandidat paling mirip berbasis vektor embedding.

- **Fuzzy Matching**  
  Menghitung skor kesamaan berbasis teks menggunakan metode `fuzz.ratio` dari `fuzzywuzzy`.

- **Combine Score**  
  Menggabungkan skor FAISS dan skor fuzzy menjadi satu dataframe kandidat akhir.

---

### 3. 🧠 Prediction Layer

- **Load Model**  
  Model klasifikasi (`XGBoost`) dimuat dari file `.pkl`.

- **Predict**  
  Model digunakan untuk memprediksi hasil pencocokan (match/tidak match) dari kandidat FAISS + fuzzy.

---

### 4. 📤 Output Layer

- **Label Output**  
  Hasil prediksi akhir berupa label (misal: cocok/tidak cocok).

- **Save to Supabase**  
  Data hasil prediksi ditulis kembali ke Supabase.

---

## 🏋️‍♀️ Training

- Sistem mendukung pelatihan ulang (retraining) menggunakan data validasi manual yang telah disimpan.
- Data pelatihan digunakan untuk mengupdate model XGBoost guna meningkatkan akurasi.

---
