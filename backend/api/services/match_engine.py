import os
import pandas as pd
import numpy as np
import faiss
import xgboost as xgb
from fuzzywuzzy import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import log_loss
from imblearn.over_sampling import SMOTE
from rest_framework.response import Response

XGB_MODEL_PATH = "xgb_model_faiss.json"
TRAINING_DATA_PATH = "training_data.json"

# Inisialisasi file training_data.json jika belum ada
if not os.path.exists(TRAINING_DATA_PATH):
    pd.DataFrame(columns=['fuzzy_combined', 'faiss_score', 'user_validasi']).to_json(
        TRAINING_DATA_PATH, index=False)


def run_faiss_matching(combined_path, export_csv_path, current_progress):
    try:
        print("🚀 Memulai FAISS Matching")

        if not os.path.exists(combined_path):
            return Response({'error': 'Data belum tersedia. Harap pilih kolom terlebih dahulu.'}, status=400)

        # ✅ Baca dan validasi file
        df_raw = pd.read_json(combined_path, dtype=False)
        if 'combined' not in df_raw.columns:
            return Response({'error': 'Kolom "combined" tidak ditemukan.'}, status=400)

        # ✅ Bersihkan dan filter data combined
        df = df_raw.copy()
        df['combined'] = df['combined'].apply(
            lambda x: str(x).strip() if pd.notnull(x) else "")
        df = df[df['combined'].str.len() > 0]
        df = df.drop_duplicates(subset='combined').reset_index(drop=True)

        print("✅ Jumlah baris setelah dibersihkan:", len(df))

        # ✅ TF-IDF vectorizer aman memori
        print("🔠 Memulai TF-IDF")
        vectorizer = TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(2, 4),
            max_features=1000
        )
        X_sparse = vectorizer.fit_transform(df['combined'])
        X_dense = X_sparse.astype(np.float32).toarray()
        print("📏 TF-IDF selesai. Shape:", X_dense.shape)

        # ✅ FAISS Matching antar chunk
        chunk_size = 5000
        n_total = len(df)
        n_batches = (n_total + chunk_size - 1) // chunk_size
        results = []
        current_progress['total'] = n_batches * (n_batches + 1) // 2
        current_progress['current'] = 1

        for i in range(n_batches):
            for j in range(i, n_batches):
                start_i, end_i = i * \
                    chunk_size, min((i + 1) * chunk_size, n_total)
                start_j, end_j = j * \
                    chunk_size, min((j + 1) * chunk_size, n_total)

                X_i = X_dense[start_i:end_i]
                X_j = X_dense[start_j:end_j]

                index = faiss.IndexFlatL2(X_i.shape[1])
                index.add(X_i)
                D, I = index.search(X_j, 6)

                for k in range(end_j - start_j):
                    for r in range(1, 6):  # Skip self match
                        idx_i = I[k][r]
                        if idx_i == -1 or idx_i >= (end_i - start_i):
                            continue
                        global_i = start_i + idx_i
                        global_j = start_j + k
                        dist = D[k][r]
                        score = 1 / (1 + dist)

                        results.append({
                            'id_1': global_i,
                            'id_2': global_j,
                            'combined_1': df.loc[global_i, 'combined'],
                            'combined_2': df.loc[global_j, 'combined'],
                            'faiss_score': round(score, 6),
                            'fuzzy_combined': fuzz.token_sort_ratio(
                                df.loc[global_i, 'combined'],
                                df.loc[global_j, 'combined']
                            )
                        })
                current_progress['current'] += 1

        if not results:
            return Response({'error': 'Tidak ada hasil pencocokan.'}, status=400)

        # ✅ Simpan ke DataFrame
        df_result = pd.DataFrame(results)
        df_result['label'] = (df_result['fuzzy_combined'] > 90).astype(int)
        df_result['user_validasi'] = ""

        X = df_result[['fuzzy_combined', 'faiss_score']]
        y = df_result['label']

        # ✅ Load atau fallback model
        use_model = False
        if os.path.exists(XGB_MODEL_PATH):
            try:
                model = xgb.XGBClassifier()
                model.load_model(XGB_MODEL_PATH)
                proba = model.predict_proba(X)[:, 1]
                df_result['confidence'] = proba
                df_result['ambiguous'] = (
                    ((df_result['fuzzy_combined'].between(85, 90)) |
                     (proba >= 0.4) & (proba <= 0.6))
                ).astype(int)
                df_result['predicted'] = model.predict(X)
                use_model = True
            except Exception as e:
                print("⚠️ Model tidak dapat digunakan:", e)

        if not use_model:
            df_result['confidence'] = 0.0
            df_result['ambiguous'] = df_result['fuzzy_combined'].between(
                85, 90).astype(int)
            df_result['predicted'] = df_result['label']

        # ✅ Simpan hasil
        df_result.to_csv(export_csv_path, index=False)
        print("💾 Hasil disimpan ke:", export_csv_path)

        retrain_log = train_xgb_from_validasi(df_result)

        return Response({
            'results': df_result[df_result['ambiguous'] == 1].head(10).to_dict(orient='records'),
            'ambiguous': df_result[df_result['ambiguous'] == 1].head(10).to_dict(orient='records'),
            'retrain_log': retrain_log
        })

    except Exception as e:
        import traceback
        print("❌ ERROR FAISS Matching:", str(e))
        traceback.print_exc()
        return Response({'error': str(e)}, status=400)


def train_xgb_from_validasi(df_result, min_new_samples=10):
    validated = df_result[df_result['user_validasi'].isin([0, 1])]

    if len(validated) < min_new_samples:
        return "Validasi user belum cukup untuk retraining"

    if os.path.exists(TRAINING_DATA_PATH):
        old_data = pd.read_json(TRAINING_DATA_PATH)
        all_data = pd.concat([old_data, validated],
                             ignore_index=True).drop_duplicates()
    else:
        all_data = validated.copy()

    all_data.to_json(TRAINING_DATA_PATH, index=False)

    X = all_data[['fuzzy_combined', 'faiss_score']]
    y = all_data['user_validasi'].astype(int)

    smote = SMOTE(random_state=42)
    X_res, y_res = smote.fit_resample(X, y)

    X_train, X_test, y_train, y_test = train_test_split(
        X_res, y_res, test_size=0.2, random_state=42)
    model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
    model.fit(X_train, y_train)
    new_logloss = log_loss(y_test, model.predict_proba(X_test))

    if os.path.exists(XGB_MODEL_PATH):
        old_model = xgb.XGBClassifier()
        old_model.load_model(XGB_MODEL_PATH)
        old_loss = log_loss(y_test, old_model.predict_proba(X_test))

        if new_logloss < old_loss:
            model.save_model(XGB_MODEL_PATH)
            return f"Model retrained and improved: {old_loss:.4f} → {new_logloss:.4f}"
        else:
            return f"Model not updated. New logloss {new_logloss:.4f} worse than {old_loss:.4f}"
    else:
        model.save_model(XGB_MODEL_PATH)
        return f"Model trained for first time with logloss: {new_logloss:.4f}"
