from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import FileResponse
from django.core.files.storage import default_storage
import os
from django.views.decorators.csrf import csrf_exempt
from .services.match_engine import run_faiss_matching
from django.views.decorators.csrf import csrf_exempt
from api.models import MatchingData
from .utils.Upload_handler import delete_table_by_name, export_table_to_excel, get_table_data, handle_uploaded_file #get_recommended_columns, process_combined_columns
 
COMBINED_PATH = "combined.json"
EXPORT_CSV_PATH = "matching_result_faiss_validated.csv"
TEMP_FILE_PATH ="upload.xlxs"
current_progress = {'current': 0, 'total': 1}



@api_view(['GET'])
def progress_faiss(request):
    return Response(current_progress)

@csrf_exempt
@api_view(['POST'])
def upload_file(request):
    import tempfile

    if 'table_name' not in request.POST:
        return Response({'error': 'Parameter table_name wajib disediakan'}, status=400)

    table_name = request.POST['table_name']

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        temp_path = tmp.name

    return handle_uploaded_file(request, temp_path, table_name)

@api_view(['GET', 'DELETE'])
def handle_table_operations(request):
    if request.method == 'GET':
        return get_table_data(request)
    elif request.method == 'DELETE':
        return delete_table_by_name(request)
    
@api_view(['GET'])
def export_table(request):
    return export_table_to_excel(request)

# @api_view(['GET'])
# def recommend_columns(request):
#     return get_recommended_columns(TEMP_FILE_PATH)


# @api_view(['POST'])
# def process_columns(request):
#     return process_combined_columns(request, TEMP_FILE_PATH, COMBINED_PATH)


# @api_view(['POST'])
# def match_faiss(request):
#     return run_faiss_matching(COMBINED_PATH, EXPORT_CSV_PATH, current_progress)


# @api_view(['GET'])
# def download_results(request):
#     if not os.path.exists(EXPORT_CSV_PATH):
#         return Response({'error': 'File belum tersedia'}, status=404)
#     return FileResponse(open(EXPORT_CSV_PATH, 'rb'), as_attachment=True, filename='matching_result_faiss_validated.csv')


# @api_view(['POST'])
# def validate_item(request):
#     import os
#     import pandas as pd
#     from .services.match_engine import TRAINING_DATA_PATH
#     print("📬 METHOD:", request.method)
#     print("📬 Headers:", request.headers)
#     print("📬 Content-Type:", request.content_type)
#     print("📬 Body:", request.body)
#     print("📬 Data:", request.data)

#     data = request.data
#     print("📨 Data diterima di validate_item:", data)

#     required_keys = ['fuzzy_combined', 'faiss_score', 'user_validasi']
#     if not all(key in data for key in required_keys):
#         print("⚠️ Data tidak lengkap:", data)
#         return Response({'error': 'Data tidak lengkap'}, status=400)

#     try:
#         if os.path.exists(TRAINING_DATA_PATH):
#             df = pd.read_json(TRAINING_DATA_PATH)
#         else:
#             df = pd.DataFrame(columns=required_keys)

#         new_df = pd.DataFrame([data])
#         df = pd.concat([df, new_df], ignore_index=True).drop_duplicates()
#         df.to_json(TRAINING_DATA_PATH, index=False)

#         print("✅ Data berhasil disimpan ke:", TRAINING_DATA_PATH)
#         return Response({'message': 'Validasi berhasil disimpan'})

#     except Exception as e:
#         print("❌ ERROR saat menyimpan validasi:", str(e))
#         return Response({'error': str(e)}, status=500)


# @api_view(['POST'])
# def retrain_model(request):
#     from .services.match_engine import train_xgb_from_validasi, TRAINING_DATA_PATH
#     import pandas as pd

#     if not os.path.exists(TRAINING_DATA_PATH):
#         return Response({'error': 'Belum ada data pelatihan'}, status=400)

#     df = pd.read_json(TRAINING_DATA_PATH)
#     log = train_xgb_from_validasi(df)

#     return Response({'retrain_log': log})


# @api_view(['POST'])
# def undo_validation(request):
#     from .services.match_engine import TRAINING_DATA_PATH
#     import pandas as pd

#     data = request.data
#     fuzzy = data.get('fuzzy_combined')
#     faiss = data.get('faiss_score')

#     if fuzzy is None or faiss is None:
#         return Response({'error': 'fuzzy_combined dan faiss_score diperlukan'}, status=400)

#     if not os.path.exists(TRAINING_DATA_PATH):
#         return Response({'error': 'Tidak ada data validasi'}, status=404)

#     df = pd.read_json(TRAINING_DATA_PATH)
#     original_len = len(df)

#     df = df[~((df['fuzzy_combined'] == fuzzy) & (df['faiss_score'] == faiss))]

#     df.to_json(TRAINING_DATA_PATH, index=False)
#     removed = original_len - len(df)

#     if removed:
#         return Response({'message': f'{removed} data dihapus dari validasi'})
#     else:
#         return Response({'message': 'Data tidak ditemukan untuk dibatalkan'})


# @api_view(['GET'])
# def export_cleaned_results(request):
#     import pandas as pd

#     print("📥 Menerima request export_cleaned_results")

#     if not os.path.exists("matching_result_faiss_validated.csv"):
#         return Response({'error': 'File matching belum tersedia'}, status=404)

#     if not os.path.exists("uploaded.xlsx"):
#         return Response({'error': 'File upload belum tersedia'}, status=404)

#     df_all = pd.read_excel("uploaded.xlsx")
#     df_all['combined'] = df_all.astype(str).agg(' '.join, axis=1).str.lower()

#     df_result = pd.read_csv("matching_result_faiss_validated.csv")

#     # Ambil hasil validasi manual jika ada
#     validated = df_result[df_result['user_validasi'].isin([0, 1])]

#     # 🟢 Jika tidak ada hasil validasi manual, gunakan hasil prediksi confident
#     if validated.empty:
#         confident_pred = df_result[df_result['confidence'] > 0.9].copy()
#         print("⚠️ Tidak ada validasi manual, pakai prediksi confident")
#         validated = confident_pred
#         validated['user_validasi'] = validated['predicted']

#     # Ambil index unik dari hasil validasi/prediksi
#     keep_indices = set()
#     for _, row in validated.iterrows():
#         if row['user_validasi'] == 1:
#             keep_indices.add(int(row['id_1']))  # Ambil salah satu
#         else:
#             keep_indices.add(int(row['id_1']))
#             keep_indices.add(int(row['id_2']))

#     df_cleaned = df_all.iloc[list(keep_indices)].drop_duplicates().reset_index(drop=True)
#     df_cleaned.to_excel("final_cleaned_output.xlsx", index=False)

#     print("🟡 Jumlah data upload:", len(df_all))
#     print("🟡 Jumlah hasil match:", len(df_result))
#     print("🟢 Jumlah hasil validasi:", len(validated))
#     print("🟢 Indeks yang disimpan:", keep_indices)
#     print("✅ Baris akhir di Excel:", len(df_cleaned))

#     from django.http import FileResponse
#     return FileResponse(open("final_cleaned_output.xlsx", 'rb'), as_attachment=True, filename="final_cleaned_output.xlsx")

# @api_view(['GET'])
# def get_progress(request):
#     return Response(current_match_progress)

# @api_view(['GET'])
# def get_uploaded_columns(request):
#     snap_data = SnapwangiData.objects.last()
#     kop_data = KopindagData.objects.last()

#     snap_cols = list(snap_data.data.keys()) if snap_data and isinstance(snap_data.data, dict) else []
#     kop_cols = list(kop_data.data.keys()) if kop_data and isinstance(kop_data.data, dict) else []

#     return Response({
#         "snapwangi_columns": snap_cols,
#         "kopindag_columns": kop_cols
#     })

# @api_view(['POST'])
# def upload_database(request):
#     if not os.path.exists(COMBINED_PATH):
#         return Response({'error': 'combined.json belum tersedia'}, status=400)

#     try:

#         # Hapus semua data Snapwangi sebelum upload baru (override)
#         Snapwangi.objects.all().delete()
#         # Reset sequence id agar id dimulai dari 1
#         from django.db import connection
#         with connection.cursor() as cursor:
#             cursor.execute("ALTER SEQUENCE api_snapwangi_id_seq RESTART WITH 1;")

#         import json
#         with open(COMBINED_PATH, 'r', encoding='utf-8') as f:
#             combined_data = json.load(f)

#         # Dapatkan semua id unik dari salah satu field (selain 'combined')
#         fields = [k for k in combined_data.keys() if k != 'combined']
#         if not fields:
#             return Response({'error': 'Tidak ada field selain combined di combined.json'}, status=400)

#         # Ambil semua id unik
#         id_set = set()
#         for field in fields:
#             id_set.update(combined_data[field].keys())

#         count = 0
#         for id_key in id_set:
#             row = {}
#             for field in fields:
#                 value = combined_data[field].get(id_key)
#                 if value is not None:
#                     row[field] = value
#             Snapwangi.objects.create(data=row)
#             count += 1

#         return Response({'message': f'{count} data berhasil diupload ke Snapwangi'})
#     except Exception as e:
#         import traceback
#         print('[ERROR upload_database]', str(e))
#         traceback.print_exc()
#         return Response({'error': str(e)}, status=400)
    
#     from api.models import MatchingData

# def store_matching_results(df_result, snap_df, kop_df):
#     matched_snap_ids = set()
#     matched_kop_ids = set()

#     for _, row in df_result.iterrows():
#         snap_idx = int(row['snap_index'])
#         kop_idx = int(row['kop_index'])

#         snap_data = snap_df.iloc[snap_idx].to_dict()
#         kop_data = kop_df.iloc[kop_idx].to_dict()

#         # Simpan yang matched (dua arah)
#         MatchingData.objects.create(
#             source="snapwangi",
#             data=snap_data,
#             matched_with=kop_data,
#             confidence=row['faiss_score'],
#             fuzzy_score=row['fuzzy_score']
#         )
#         MatchingData.objects.create(
#             source="kopindag",
#             data=kop_data,
#             matched_with=snap_data,
#             confidence=row['faiss_score'],
#             fuzzy_score=row['fuzzy_score']
#         )

#         matched_snap_ids.add(snap_idx)
#         matched_kop_ids.add(kop_idx)

#     # Simpan unmatched Snapwangi
#     for idx in set(range(len(snap_df))) - matched_snap_ids:
#         MatchingData.objects.create(
#             source="snapwangi",
#             data=snap_df.iloc[idx].to_dict()
#         )

#     # Simpan unmatched Kopindag
#     for idx in set(range(len(kop_df))) - matched_kop_ids:
#         MatchingData.objects.create(
#             source="kopindag",
#             data=kop_df.iloc[idx].to_dict()
#         )
        
     