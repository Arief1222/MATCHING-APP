import os
import faiss
import pandas as pd
import xgboost as xgb
from fuzzywuzzy import fuzz
from django.http import FileResponse
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view
from rest_framework.response import Response
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split

TEMP_FILE_PATH = "uploaded.xlsx"
COMBINED_PATH = "combined.json"
EXPORT_CSV_PATH = "matching_result_faiss_validated.csv"
XGB_MODEL_PATH = "xgb_model_faiss.json"

# Variabel global untuk progress
current_progress = {'current': 0, 'total': 1}

@api_view(['GET'])
def progress_faiss(request):
    return Response(current_progress)

@api_view(['POST'])
def upload_file(request):
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=400)

    file = request.FILES['file']
    with default_storage.open(TEMP_FILE_PATH, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)

    try:
        df = pd.read_excel(TEMP_FILE_PATH)
        return Response({'columns': df.columns.tolist()})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def recommend_columns(request):
    if not os.path.exists(TEMP_FILE_PATH):
        return Response({'error': 'File belum diupload'}, status=400)

    try:
        df = pd.read_excel(TEMP_FILE_PATH)
        rekomendasi = []

        for col in df.columns:
            if df[col].dtype == 'object':
                if df[col].notnull().mean() > 0.8 and df[col].dropna().astype(str).str.len().mean() > 3 and df[col].nunique() > 10:
                    rekomendasi.append(col)

        return Response({'recommended_columns': rekomendasi})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
def process_columns(request):
    selected_cols = request.data.get('columns', [])

    if not selected_cols:
        return Response({'error': 'No columns selected'}, status=400)
    if not os.path.exists(TEMP_FILE_PATH):
        return Response({'error': 'No file uploaded yet'}, status=400)

    try:
        df = pd.read_excel(TEMP_FILE_PATH)
        df_clean = df[selected_cols].dropna().drop_duplicates().reset_index(drop=True)
        df_clean['combined'] = df_clean[selected_cols].astype(str).agg(' '.join, axis=1).str.lower()
        df_clean.to_json(COMBINED_PATH)

        return Response({
            'message': 'Kolom berhasil digabung',
            'combined_sample': df_clean['combined'].head(5).tolist()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
def match_faiss(request):
    try:
        if not os.path.exists(COMBINED_PATH):
            return Response({'error': 'Data belum tersedia. Harap pilih kolom terlebih dahulu.'}, status=400)

        df = pd.read_json(COMBINED_PATH)

        if 'combined' not in df.columns:
            return Response({'error': 'Kolom "combined" tidak ditemukan.'}, status=400)

        df['combined'] = df['combined'].fillna('').astype(str).str.strip()
        vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4), max_features=10000)
        X_sparse = vectorizer.fit_transform(df['combined'])
        X_dense = X_sparse.toarray().astype('float32')

        chunk_size = 5000
        n_total = len(df)
        n_batches = (n_total + chunk_size - 1) // chunk_size

        results = []
        current_progress['total'] = n_batches * (n_batches + 1) // 2
        current_progress['current'] += 1

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
                    for r in range(1, 6):
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
                                df.loc[global_i, 'combined'], df.loc[global_j, 'combined']
                            )
                        })

                current_progress['current'] += 1

        df_result = pd.DataFrame(results)
        df_result['label'] = (df_result['fuzzy_combined'] > 85).astype(int)
        df_result['user_validasi'] = ""

        X = df_result[['fuzzy_combined', 'faiss_score']]
        y = df_result['label']

        if not os.path.exists(XGB_MODEL_PATH):
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
            model.fit(X_train, y_train)
            model.save_model(XGB_MODEL_PATH)
        else:
            model = xgb.XGBClassifier()
            model.load_model(XGB_MODEL_PATH)

        df_result['predicted'] = model.predict(X)
        df_result.to_csv(EXPORT_CSV_PATH, index=False)

        return Response({'results': df_result.head(10).to_dict(orient='records')})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def download_results(request):
    if not os.path.exists(EXPORT_CSV_PATH):
        return Response({'error': 'File belum tersedia'}, status=404)
    return FileResponse(open(EXPORT_CSV_PATH, 'rb'), as_attachment=True, filename='matching_result_faiss_validated.csv')
