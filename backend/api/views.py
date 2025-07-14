# views.py
# Endpoint endpoint (API)
# Mengambil request, memanggil fungsi dari file lain (service/helper)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import FileResponse
from django.core.files.storage import default_storage

import os
from .services.match_engine import run_faiss_matching
from .utils.file_handler import handle_upload_file, get_recommended_columns, process_combined_columns

TEMP_FILE_PATH = "uploaded.xlsx"
COMBINED_PATH = "combined.json"
EXPORT_CSV_PATH = "matching_result_faiss_validated.csv"

current_progress = {'current': 0, 'total': 1}

@api_view(['POST'])
def upload_database(request):
    uploaded_file = request.FILES.get('file')

    if not uploaded_file:
        return Response({'error': 'Tidak ada file yang diupload'}, status=400)

    with open("uploaded.xlsx", 'wb+') as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)

    return Response({'message': '✅ File berhasil disimpan sebagai uploaded.xlsx'})

@api_view(['GET'])
def progress_faiss(request):
    return Response(current_progress)


@api_view(['POST'])
def upload_file(request):
    return handle_upload_file(request, TEMP_FILE_PATH)


@api_view(['GET'])
def recommend_columns(request):
    return get_recommended_columns(TEMP_FILE_PATH)


@api_view(['POST'])
def process_columns(request):
    return process_combined_columns(request, TEMP_FILE_PATH, COMBINED_PATH)


@api_view(['POST'])
def match_faiss(request):
    return run_faiss_matching(COMBINED_PATH, EXPORT_CSV_PATH, current_progress)


@api_view(['GET'])
def download_results(request):
    if not os.path.exists(EXPORT_CSV_PATH):
        return Response({'error': 'File belum tersedia'}, status=404)
    return FileResponse(open(EXPORT_CSV_PATH, 'rb'), as_attachment=True, filename='matching_result_faiss_validated.csv')


@api_view(['POST'])
def validate_item(request):
    import os
    import pandas as pd
    from .services.match_engine import TRAINING_DATA_PATH
    print("📬 METHOD:", request.method)
    print("📬 Headers:", request.headers)
    print("📬 Content-Type:", request.content_type)
    print("📬 Body:", request.body)
    print("📬 Data:", request.data)

    data = request.data
    print("📨 Data diterima di validate_item:", data)

    required_keys = ['fuzzy_combined', 'faiss_score', 'user_validasi']
    if not all(key in data for key in required_keys):
        print("⚠️ Data tidak lengkap:", data)
        return Response({'error': 'Data tidak lengkap'}, status=400)

    try:
        if os.path.exists(TRAINING_DATA_PATH):
            df = pd.read_json(TRAINING_DATA_PATH)
        else:
            df = pd.DataFrame(columns=required_keys)

        new_df = pd.DataFrame([data])
        df = pd.concat([df, new_df], ignore_index=True).drop_duplicates()
        df.to_json(TRAINING_DATA_PATH, index=False)

        print("✅ Data berhasil disimpan ke:", TRAINING_DATA_PATH)
        return Response({'message': 'Validasi berhasil disimpan'})

    except Exception as e:
        print("❌ ERROR saat menyimpan validasi:", str(e))
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def retrain_model(request):
    from .services.match_engine import train_xgb_from_validasi, TRAINING_DATA_PATH
    import pandas as pd

    if not os.path.exists(TRAINING_DATA_PATH):
        return Response({'error': 'Belum ada data pelatihan'}, status=400)

    df = pd.read_json(TRAINING_DATA_PATH)
    log = train_xgb_from_validasi(df)

    return Response({'retrain_log': log})


@api_view(['POST'])
def undo_validation(request):
    from .services.match_engine import TRAINING_DATA_PATH
    import pandas as pd

    data = request.data
    fuzzy = data.get('fuzzy_combined')
    faiss = data.get('faiss_score')

    if fuzzy is None or faiss is None:
        return Response({'error': 'fuzzy_combined dan faiss_score diperlukan'}, status=400)

    if not os.path.exists(TRAINING_DATA_PATH):
        return Response({'error': 'Tidak ada data validasi'}, status=404)

    df = pd.read_json(TRAINING_DATA_PATH)
    original_len = len(df)

    df = df[~((df['fuzzy_combined'] == fuzzy) & (df['faiss_score'] == faiss))]

    df.to_json(TRAINING_DATA_PATH, index=False)
    removed = original_len - len(df)

    if removed:
        return Response({'message': f'{removed} data dihapus dari validasi'})
    else:
        return Response({'message': 'Data tidak ditemukan untuk dibatalkan'})


@api_view(['GET'])
def export_cleaned_results(request):
    import pandas as pd

    print("📥 Menerima request export_cleaned_results")

    if not os.path.exists("matching_result_faiss_validated.csv"):
        return Response({'error': 'File matching belum tersedia'}, status=404)

    if not os.path.exists("uploaded.xlsx"):
        return Response({'error': 'File upload belum tersedia'}, status=404)

    df_all = pd.read_excel("uploaded.xlsx")
    df_all['combined'] = df_all.astype(str).agg(' '.join, axis=1).str.lower()

    df_result = pd.read_csv("matching_result_faiss_validated.csv")

    # Ambil hasil validasi manual jika ada
    validated = df_result[df_result['user_validasi'].isin([0, 1])]

    # 🟢 Jika tidak ada hasil validasi manual, gunakan hasil prediksi confident
    if validated.empty:
        confident_pred = df_result[df_result['confidence'] > 0.9].copy()
        print("⚠️ Tidak ada validasi manual, pakai prediksi confident")
        validated = confident_pred
        validated['user_validasi'] = validated['predicted']

    # Ambil index unik dari hasil validasi/prediksi
    keep_indices = set()
    for _, row in validated.iterrows():
        if row['user_validasi'] == 1:
            keep_indices.add(int(row['id_1']))  # Ambil salah satu
        else:
            keep_indices.add(int(row['id_1']))
            keep_indices.add(int(row['id_2']))

    df_cleaned = df_all.iloc[list(keep_indices)].drop_duplicates().reset_index(drop=True)
    df_cleaned.to_excel("final_cleaned_output.xlsx", index=False)

    print("🟡 Jumlah data upload:", len(df_all))
    print("🟡 Jumlah hasil match:", len(df_result))
    print("🟢 Jumlah hasil validasi:", len(validated))
    print("🟢 Indeks yang disimpan:", keep_indices)
    print("✅ Baris akhir di Excel:", len(df_cleaned))

    from django.http import FileResponse
    return FileResponse(open("final_cleaned_output.xlsx", 'rb'), as_attachment=True, filename="final_cleaned_output.xlsx")


