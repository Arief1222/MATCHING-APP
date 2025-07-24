<img width="442" height="1746" alt="Untitled Diagram drawio (48)" src="https://github.com/user-attachments/assets/a366d9c6-f58c-49fd-80c3-d8650e2a92cf" />

🧠 Matching Engine Workflow
📦 Data Layer
SupabaseService
Mengambil data input dan mapping kolom dari Supabase.

Gabung Kolom
Data digabung menjadi satu string (concatenated) agar bisa diproses oleh model NLP.

🔍 Matching Engine
Vectorization
Menggunakan SentenceTransformer untuk mengubah data teks menjadi vektor embedding.

FAISS Matching
Mencari kandidat paling mirip berdasarkan kemiripan vektor menggunakan FAISS (Facebook AI Similarity Search).

Fuzzy Matching
Menambahkan skor berbasis kemiripan string teks (Levenshtein / Jaro-Winkler) untuk memperkuat akurasi.

Gabung Skor
Hasil dari FAISS dan Fuzzy digabung dan disiapkan dalam format akhir untuk klasifikasi.

🧪 Prediction Layer
Load Model
Model XGBoost dimuat dari file .pkl.

Prediksi Kecocokan
Model melakukan klasifikasi ke dalam label akhir berdasarkan skor FAISS + Fuzzy.

📤 Output Layer
Label Hasil
Output diklasifikasikan sebagai:

MATCH

UNMATCH

AMBIGUOUS

ENRICHED

Simpan ke Supabase
Hasil akhir dan status job disimpan kembali ke Supabase, termasuk metadata.

🔁 Training Loop (Opsional)
Data Validasi Manual
Data hasil validasi manual dari pengguna dikumpulkan untuk proses retraining.

Retrain Model
Model XGBoost dapat dilatih ulang menggunakan data validasi untuk peningkatan akurasi di masa depan.


