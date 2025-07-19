
import os
import pandas as pd
import numpy as np
import faiss
import xgboost as xgb
from fuzzywuzzy import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from sklearn.metrics import log_loss
from imblearn.over_sampling import SMOTE
import uuid
from datetime import datetime
from .supabase_service import SupabaseService
from api.models import MatchingResult, LabelingData, MatchingJob


class MatchingEngine:
    def __init__(self):
        self.supabase_service = SupabaseService()
        self.XGB_MODEL_PATH = "xgb_model_faiss.json"
        self.TRAINING_DATA_PATH = "training_data.json"
        
    def save_job_status(self, job_id: str, table_name: str):
        MatchingJob.objects.create(
            job_id=job_id,
            table_name=table_name,
            status="Pending",
            start_time=datetime.utcnow()
        )

    def update_job_status(self, job_id: str, status: str):
        job = MatchingJob.objects.filter(job_id=job_id).first()
        if job:
            job.status = status
            job.end_time = datetime.utcnow()
            job.save()
        
    def get_recommended_columns(self, table_name: str):
        """Analisis dan rekomendasikan kolom untuk matching"""
        try:
            df = self.supabase_service.get_table_data(table_name)
            if df.empty:
                return []
            
            rekomendasi = []
            for col in df.columns:
                if df[col].dtype == 'object':
                    # Cek kualitas kolom untuk matching
                    null_ratio = df[col].notnull().mean()
                    avg_length = df[col].dropna().astype(str).str.len().mean()
                    unique_count = df[col].nunique()
                    
                    if null_ratio > 0.8 and avg_length > 3 and unique_count > 10:
                        rekomendasi.append({
                            'column': col,
                            'quality_score': null_ratio * 0.4 + min(avg_length/20, 1) * 0.3 + min(unique_count/100, 1) * 0.3,
                            'null_ratio': null_ratio,
                            'avg_length': avg_length,
                            'unique_count': unique_count
                        })
            
            # Sort by quality score
            rekomendasi.sort(key=lambda x: x['quality_score'], reverse=True)
            return rekomendasi[:5]  # Return top 5 recommendations
            
        except Exception as e:
            print(f"Error in get_recommended_columns: {e}")
            return []
    
    def recommend_column_mapping(self, table_a: str, table_b: str):
        """Rekomendasikan mapping kolom antar tabel"""
        try:
            cols_a = self.supabase_service.get_table_columns(table_a)
            cols_b = self.supabase_service.get_table_columns(table_b)
            
            recommendations = []
            
            # Vectorizer untuk nama kolom
            vectorizer = TfidfVectorizer(analyzer='char', ngram_range=(2, 3))
            
            if cols_a and cols_b:
                all_cols = cols_a + cols_b
                vectors = vectorizer.fit_transform(all_cols)
                
                # Hitung similarity matrix
                similarity_matrix = cosine_similarity(vectors[:len(cols_a)], vectors[len(cols_a):])
                
                for i, col_a in enumerate(cols_a):
                    for j, col_b in enumerate(cols_b):
                        similarity = similarity_matrix[i][j]
                        fuzzy_score = fuzz.ratio(col_a.lower(), col_b.lower())
                        
                        combined_score = similarity * 0.6 + (fuzzy_score / 100) * 0.4
                        
                        if combined_score > 0.5:  # Threshold untuk rekomendasi
                            recommendations.append({
                                'column_a': col_a,
                                'column_b': col_b,
                                'similarity_score': combined_score,
                                'fuzzy_score': fuzzy_score
                            })
            
            # Sort by similarity score
            recommendations.sort(key=lambda x: x['similarity_score'], reverse=True)
            return recommendations[:10]  # Return top 10 recommendations
            
        except Exception as e:
            print(f"Error in recommend_column_mapping: {e}")
            return []
    
    def prepare_combined_data(self, table_name: str, selected_columns: list):
        """Gabungkan kolom yang dipilih menjadi combined string"""
        try:
            df = self.supabase_service.get_table_data(table_name)
            if df.empty:
                return None
            
            # Filter kolom yang dipilih
            df_selected = df[selected_columns].copy()
            
            # Bersihkan data
            df_clean = df_selected.dropna().drop_duplicates().reset_index(drop=True)
            
            # Gabungkan kolom menjadi combined string
            df_clean['combined'] = df_clean[selected_columns].astype(str).agg(' '.join, axis=1).str.lower()
            df_clean['table_source'] = table_name
            df_clean['original_index'] = df_clean.index
            
            return df_clean
            
        except Exception as e:
            print(f"Error in prepare_combined_data: {e}")
            return None
    
    def run_faiss_matching(self, df_combined: pd.DataFrame, batch_id: str, source_table: str, reference_table: str):
        """Jalankan FAISS matching"""
        try:
            print("🚀 Memulai FAISS Matching")
            
            # TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                analyzer='char_wb',
                ngram_range=(2, 4),
                max_features=1000
            )
            X_sparse = vectorizer.fit_transform(df_combined['combined'])
            X_dense = X_sparse.astype(np.float32).toarray()
            
            # FAISS matching
            results = []
            chunk_size = 5000
            n_total = len(df_combined)
            n_batches = (n_total + chunk_size - 1) // chunk_size
            
            for i in range(n_batches):
                for j in range(i, n_batches):
                    start_i = i * chunk_size
                    end_i = min((i + 1) * chunk_size, n_total)
                    start_j = j * chunk_size
                    end_j = min((j + 1) * chunk_size, n_total)
                    
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
                            
                            if global_i == global_j:  # Skip self match
                                continue
                                
                            dist = D[k][r]
                            faiss_score = 1 / (1 + dist)
                            
                            fuzzy_score = fuzz.token_sort_ratio(
                                df_combined.iloc[global_i]['combined'],
                                df_combined.iloc[global_j]['combined']
                            )
                            
                            results.append({
                                'id_1': global_i,
                                'id_2': global_j,
                                'combined_1': df_combined.iloc[global_i]['combined'],
                                'combined_2': df_combined.iloc[global_j]['combined'],
                                'faiss_score': round(faiss_score, 6),
                                'fuzzy_score': fuzzy_score,
                                'batch_id': batch_id,
                                'source_table': source_table,
                                'reference_table': reference_table
                            })
            
            return results
            
        except Exception as e:
            print(f"Error in run_faiss_matching: {e}")
            return []
    
    def run_complete_matching(self, table_a: str, table_b: str, columns_a: list, columns_b: list = None):
        """Jalankan matching lengkap dengan semua algoritma"""
        try:
            batch_id = str(uuid.uuid4())
            
            # Prepare data
            df_a = self.prepare_combined_data(table_a, columns_a)
            if df_a is None:
                return {'error': 'Failed to prepare data from table A'}
            
            # Jika table_b tidak ada, lakukan self-matching
            if table_b is None or table_b == table_a:
                df_combined = df_a
                is_self_matching = True
            else:
                df_b = self.prepare_combined_data(table_b, columns_b)
                if df_b is None:
                    return {'error': 'Failed to prepare data from table B'}
                df_combined = pd.concat([df_a, df_b], ignore_index=True)
                is_self_matching = False
            
            # Run matching algorithms
            faiss_results = self.run_faiss_matching(df_combined, batch_id, table_a, table_b or table_a)
            
            # Process results dengan XGBoost jika model tersedia
            processed_results = self.process_matching_results(faiss_results)
            
            # Categorize results
            categorized_results = self.categorize_results(processed_results)
            
            # Save to database
            self.save_matching_results(categorized_results, batch_id)
            
            self.update_job_status(batch_id, "Success")
            
            return {
                'batch_id': batch_id,
                'total_matches': len(categorized_results['matches']),
                'total_unmatches': len(categorized_results['unmatches']),
                'total_enriched': len(categorized_results['enriched']),
                'ambiguous_count': len(categorized_results['ambiguous']),
                'sample_matches': categorized_results['matches'][:10],
                'sample_ambiguous': categorized_results['ambiguous'][:10]
            }
            
        except Exception as e:
            print(f"Error in run_complete_matching: {e}")
            self.update_job_status(batch_id, "Failed")
            return {'error': str(e)}
    
    def process_matching_results(self, results: list):
        """Process hasil matching dengan XGBoost jika tersedia"""
        try:
            if not results:
                return []
            
            df_results = pd.DataFrame(results)
            
            # Load XGBoost model jika ada
            use_model = False
            if os.path.exists(self.XGB_MODEL_PATH):
                try:
                    model = xgb.XGBClassifier()
                    model.load_model(self.XGB_MODEL_PATH)
                    df_results['fuzzy_combined'] = df_results['fuzzy_score']
                    X = df_results[['fuzzy_combined', 'faiss_score']]
                    proba = model.predict_proba(X)[:, 1]
                    predictions = model.predict(X)
                    
                    df_results['confidence'] = proba
                    df_results['predicted'] = predictions
                    use_model = True
                    
                except Exception as e:
                    print(f"Error loading XGBoost model: {e}")
            
            # Fallback jika model tidak tersedia
            if not use_model:
                df_results['confidence'] = df_results['fuzzy_score'] / 100
                df_results['predicted'] = (df_results['fuzzy_score'] > 85).astype(int)
            
            # Determine ambiguous cases
            df_results['ambiguous'] = (
                (df_results['fuzzy_score'].between(85, 90)) |
                ((df_results['confidence'] >= 0.3) & (df_results['confidence'] <= 0.7))
            ).astype(int)
            
            return df_results.to_dict('records')
            
        except Exception as e:
            print(f"Error in process_matching_results: {e}")
            return results
    
    def categorize_results(self, results: list):
        """Kategorikan hasil matching"""
        matches = []
        unmatches = []
        enriched = []
        ambiguous = []
        
        for result in results:
            if result.get('ambiguous', 0) == 1:
                ambiguous.append(result)
            elif result.get('predicted', 0) == 1 or result.get('fuzzy_score', 0) > 90:
                # Determine if it's a match or enrichment
                if result.get('confidence', 0) > 0.8:
                    enriched.append(result)
                else:
                    matches.append(result)
            else:
                unmatches.append(result)
        
        return {
            'matches': matches,
            'unmatches': unmatches,
            'enriched': enriched,
            'ambiguous': ambiguous
        }
    
    def save_matching_results(self, categorized_results: dict, batch_id: str):
        """Simpan hasil matching ke database"""
        try:
            # Save matches
            for result in categorized_results['matches']:
                MatchingResult.objects.create(
                    batch_id=batch_id,
                    source_table=result['source_table'],
                    reference_table=result['reference_table'],
                    matching_algorithm='COMBINED',
                    matched_data=result,
                    status='MATCH',
                    confidence_score=result.get('confidence', 0.0)
                )
            
            # Save unmatches
            for result in categorized_results['unmatches']:
                MatchingResult.objects.create(
                    batch_id=batch_id,
                    source_table=result['source_table'],
                    reference_table=result['reference_table'],
                    matching_algorithm='COMBINED',
                    matched_data=result,
                    status='UNMATCH',
                    confidence_score=result.get('confidence', 0.0)
                )
            
            # Save enriched
            for result in categorized_results['enriched']:
                MatchingResult.objects.create(
                    batch_id=batch_id,
                    source_table=result['source_table'],
                    reference_table=result['reference_table'],
                    matching_algorithm='COMBINED',
                    matched_data=result,
                    status='ENRICHED',
                    confidence_score=result.get('confidence', 0.0)
                )
            
            # Save ambiguous to labeling table
            for result in categorized_results['ambiguous']:
                LabelingData.objects.create(
                    data_id=f"{batch_id}_{result['id_1']}_{result['id_2']}",
                    combined_string_1=result['combined_1'],
                    combined_string_2=result['combined_2'],
                    source_table=result['source_table'],
                    reference_table=result['reference_table']
                )
            
            print(f"✅ Saved {len(categorized_results['matches'])} matches, {len(categorized_results['unmatches'])} unmatches, {len(categorized_results['enriched'])} enriched, {len(categorized_results['ambiguous'])} ambiguous")
            
        except Exception as e:
            print(f"Error saving matching results: {e}")
    
    def train_xgb_from_validasi(self, min_new_samples=10):
        """Training XGBoost dari data validasi user"""
        try:
            # Get validated data dari labeling table
            validated_data = LabelingData.objects.filter(
                label__isnull=False,
                confirmed_by__isnull=False
            ).values()
            
            if len(validated_data) < min_new_samples:
                return "Validasi user belum cukup untuk retraining"
            
            # Convert to DataFrame
            df_validated = pd.DataFrame(validated_data)
            
            # Prepare features (hitung fuzzy score dan faiss score)
            X_list = []
            y_list = []
            
            for _, row in df_validated.iterrows():
                fuzzy_score = fuzz.token_sort_ratio(row['combined_string_1'], row['combined_string_2'])
                # Simplified faiss score calculation
                faiss_score = len(set(row['combined_string_1'].split()) & set(row['combined_string_2'].split())) / \
                             len(set(row['combined_string_1'].split()) | set(row['combined_string_2'].split()))
                
                X_list.append([fuzzy_score, faiss_score])
                y_list.append(1 if row['label'] == 'MATCH' else 0)
            
            X = np.array(X_list)
            y = np.array(y_list)
            
            # Load existing training data jika ada
            if os.path.exists(self.TRAINING_DATA_PATH):
                old_data = pd.read_json(self.TRAINING_DATA_PATH)
                old_X = old_data[['fuzzy_score', 'faiss_score']].values
                old_y = old_data['label'].values
                
                X = np.vstack([old_X, X])
                y = np.hstack([old_y, y])
            
            # Save training data
            training_df = pd.DataFrame({
                'fuzzy_score': X[:, 0],
                'faiss_score': X[:, 1],
                'label': y
            })
            training_df.to_json(self.TRAINING_DATA_PATH, index=False)
            
            # SMOTE untuk balance data
            smote = SMOTE(random_state=42)
            X_res, y_res = smote.fit_resample(X, y)
            
            # Train test split
            X_train, X_test, y_train, y_test = train_test_split(
                X_res, y_res, test_size=0.2, random_state=42
            )
            
            # Train model
            model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
            model.fit(X_train, y_train)
            new_logloss = log_loss(y_test, model.predict_proba(X_test))
            
            # Compare with existing model
            if os.path.exists(self.XGB_MODEL_PATH):
                old_model = xgb.XGBClassifier()
                old_model.load_model(self.XGB_MODEL_PATH)
                old_loss = log_loss(y_test, old_model.predict_proba(X_test))
                
                if new_logloss < old_loss:
                    model.save_model(self.XGB_MODEL_PATH)
                    return f"Model retrained and improved: {old_loss:.4f} → {new_logloss:.4f}"
                else:
                    return f"Model not updated. New logloss {new_logloss:.4f} worse than {old_loss:.4f}"
            else:
                model.save_model(self.XGB_MODEL_PATH)
                return f"Model trained for first time with logloss: {new_logloss:.4f}"
                
        except Exception as e:
            print(f"Error in train_xgb_from_validasi: {e}")
            return f"Error training model: {str(e)}"
# import os
# import pandas as pd
# import numpy as np
# import faiss
# import xgboost as xgb
# from fuzzywuzzy import fuzz
# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.model_selection import train_test_split
# from sklearn.metrics import log_loss
# from imblearn.over_sampling import SMOTE
# from rest_framework.response import Response

# XGB_MODEL_PATH = "xgb_model_faiss.json"
# TRAINING_DATA_PATH = "training_data.json"

# # Inisialisasi file training_data.json jika belum ada
# if not os.path.exists(TRAINING_DATA_PATH):
#     pd.DataFrame(columns=['fuzzy_combined', 'faiss_score', 'user_validasi']).to_json(
#         TRAINING_DATA_PATH, index=False)


# def run_faiss_matching(combined_path, export_csv_path, current_progress):
#     try:
#         print("🚀 Memulai FAISS Matching")

#         if not os.path.exists(combined_path):
#             return Response({'error': 'Data belum tersedia. Harap pilih kolom terlebih dahulu.'}, status=400)

#         # ✅ Baca dan validasi file
#         df_raw = pd.read_json(combined_path, dtype=False)
#         if 'combined' not in df_raw.columns:
#             return Response({'error': 'Kolom "combined" tidak ditemukan.'}, status=400)

#         # ✅ Bersihkan dan filter data combined
#         df = df_raw.copy()
#         df['combined'] = df['combined'].apply(
#             lambda x: str(x).strip() if pd.notnull(x) else "")
#         df = df[df['combined'].str.len() > 0]
#         df = df.drop_duplicates(subset='combined').reset_index(drop=True)

#         print("✅ Jumlah baris setelah dibersihkan:", len(df))

#         # ✅ TF-IDF vectorizer aman memori
#         print("🔠 Memulai TF-IDF")
#         vectorizer = TfidfVectorizer(
#             analyzer='char_wb',
#             ngram_range=(2, 4),
#             max_features=1000
#         )
#         X_sparse = vectorizer.fit_transform(df['combined'])
#         X_dense = X_sparse.astype(np.float32).toarray()
#         print("📏 TF-IDF selesai. Shape:", X_dense.shape)

#         # ✅ FAISS Matching antar chunk
#         chunk_size = 5000
#         n_total = len(df)
#         n_batches = (n_total + chunk_size - 1) // chunk_size
#         results = []
#         current_progress['total'] = n_batches * (n_batches + 1) // 2
#         current_progress['current'] = 1

#         for i in range(n_batches):
#             for j in range(i, n_batches):
#                 start_i, end_i = i * \
#                     chunk_size, min((i + 1) * chunk_size, n_total)
#                 start_j, end_j = j * \
#                     chunk_size, min((j + 1) * chunk_size, n_total)

#                 X_i = X_dense[start_i:end_i]
#                 X_j = X_dense[start_j:end_j]

#                 index = faiss.IndexFlatL2(X_i.shape[1])
#                 index.add(X_i)
#                 D, I = index.search(X_j, 6)

#                 for k in range(end_j - start_j):
#                     for r in range(1, 6):  # Skip self match
#                         idx_i = I[k][r]
#                         if idx_i == -1 or idx_i >= (end_i - start_i):
#                             continue
#                         global_i = start_i + idx_i
#                         global_j = start_j + k
#                         dist = D[k][r]
#                         score = 1 / (1 + dist)

#                         results.append({
#                             'id_1': global_i,
#                             'id_2': global_j,
#                             'combined_1': df.loc[global_i, 'combined'],
#                             'combined_2': df.loc[global_j, 'combined'],
#                             'faiss_score': round(score, 6),
#                             'fuzzy_combined': fuzz.token_sort_ratio(
#                                 df.loc[global_i, 'combined'],
#                                 df.loc[global_j, 'combined']
#                             )
#                         })
#                 current_progress['current'] += 1

#         if not results:
#             return Response({'error': 'Tidak ada hasil pencocokan.'}, status=400)

#         # ✅ Simpan ke DataFrame
#         df_result = pd.DataFrame(results)
#         df_result['label'] = (df_result['fuzzy_combined'] > 90).astype(int)
#         df_result['user_validasi'] = ""

#         X = df_result[['fuzzy_combined', 'faiss_score']]
#         y = df_result['label']

#         # ✅ Load atau fallback model
#         use_model = False
#         if os.path.exists(XGB_MODEL_PATH):
#             try:
#                 model = xgb.XGBClassifier()
#                 model.load_model(XGB_MODEL_PATH)
#                 proba = model.predict_proba(X)[:, 1]
#                 df_result['confidence'] = proba
#                 df_result['ambiguous'] = (
#                     ((df_result['fuzzy_combined'].between(85, 90)) |
#                      (proba >= 0.4) & (proba <= 0.6))
#                 ).astype(int)
#                 df_result['predicted'] = model.predict(X)
#                 use_model = True
#             except Exception as e:
#                 print("⚠️ Model tidak dapat digunakan:", e)

#         if not use_model:
#             df_result['confidence'] = 0.0
#             df_result['ambiguous'] = df_result['fuzzy_combined'].between(
#                 85, 90).astype(int)
#             df_result['predicted'] = df_result['label']

#         # ✅ Simpan hasil
#         df_result.to_csv(export_csv_path, index=False)
#         print("💾 Hasil disimpan ke:", export_csv_path)

#         retrain_log = train_xgb_from_validasi(df_result)

#         return Response({
#             'results': df_result[df_result['ambiguous'] == 1].head(10).to_dict(orient='records'),
#             'ambiguous': df_result[df_result['ambiguous'] == 1].head(10).to_dict(orient='records'),
#             'retrain_log': retrain_log
#         })

#     except Exception as e:
#         import traceback
#         print("❌ ERROR FAISS Matching:", str(e))
#         traceback.print_exc()
#         return Response({'error': str(e)}, status=400)


# def train_xgb_from_validasi(df_result, min_new_samples=10):
#     validated = df_result[df_result['user_validasi'].isin([0, 1])]

#     if len(validated) < min_new_samples:
#         return "Validasi user belum cukup untuk retraining"

#     if os.path.exists(TRAINING_DATA_PATH):
#         old_data = pd.read_json(TRAINING_DATA_PATH)
#         all_data = pd.concat([old_data, validated],
#                              ignore_index=True).drop_duplicates()
#     else:
#         all_data = validated.copy()

#     all_data.to_json(TRAINING_DATA_PATH, index=False)

#     X = all_data[['fuzzy_combined', 'faiss_score']]
#     y = all_data['user_validasi'].astype(int)

#     smote = SMOTE(random_state=42)
#     X_res, y_res = smote.fit_resample(X, y)

#     X_train, X_test, y_train, y_test = train_test_split(
#         X_res, y_res, test_size=0.2, random_state=42)
#     model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
#     model.fit(X_train, y_train)
#     new_logloss = log_loss(y_test, model.predict_proba(X_test))

#     if os.path.exists(XGB_MODEL_PATH):
#         old_model = xgb.XGBClassifier()
#         old_model.load_model(XGB_MODEL_PATH)
#         old_loss = log_loss(y_test, old_model.predict_proba(X_test))

#         if new_logloss < old_loss:
#             model.save_model(XGB_MODEL_PATH)
#             return f"Model retrained and improved: {old_loss:.4f} → {new_logloss:.4f}"
#         else:
#             return f"Model not updated. New logloss {new_logloss:.4f} worse than {old_loss:.4f}"
#     else:
#         model.save_model(XGB_MODEL_PATH)
#         return f"Model trained for first time with logloss: {new_logloss:.4f}"
