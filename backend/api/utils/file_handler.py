# utils/file_handler.py

import os
import pandas as pd
from django.core.files.storage import default_storage
from rest_framework.response import Response


def handle_upload_file(request, temp_file_path):
    # 🔍 DEBUG LOGGING (aman digunakan)
    print("📥 DEBUG - request.content_type:", request.content_type)
    print("📥 DEBUG - request.FILES keys:", list(request.FILES.keys()))
    print("📥 DEBUG - request.POST keys:", list(request.POST.keys()))
    
    if 'file' not in request.FILES:
        print("🚫 Tidak ada 'file' di request.FILES.")
        return Response({'error': 'No file uploaded'}, status=400)

    file = request.FILES['file']
    print(f"✅ File diterima: {file.name}, size: {file.size} bytes, content_type: {file.content_type}")

    # Simpan file sementara
    with default_storage.open(temp_file_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    print(f"💾 File disimpan sementara di: {temp_file_path}")

    # Baca dan respon kolom dari Excel
    try:
        df = pd.read_excel(temp_file_path)
        print("📊 Kolom berhasil dibaca:", df.columns.tolist())
        return Response({'columns': df.columns.tolist()})
    except Exception as e:
        print("❌ Gagal membaca Excel:", str(e))
        return Response({'error': str(e)}, status=400)



def get_recommended_columns(temp_file_path):
    if not os.path.exists(temp_file_path):
        return Response({'error': 'File belum diupload'}, status=400)

    try:
        df = pd.read_excel(temp_file_path)
        rekomendasi = []

        for col in df.columns:
            if df[col].dtype == 'object':
                if df[col].notnull().mean() > 0.8 and df[col].dropna().astype(str).str.len().mean() > 3 and df[col].nunique() > 10:
                    rekomendasi.append(col)

        return Response({'recommended_columns': rekomendasi})
    except Exception as e:
        return Response({'error': str(e)}, status=500)


def process_combined_columns(request, temp_file_path, combined_path):
    selected_cols = request.data.get('columns', [])

    if not selected_cols:
        return Response({'error': 'No columns selected'}, status=400)
    if not os.path.exists(temp_file_path):
        return Response({'error': 'No file uploaded yet'}, status=400)

    try:
        df = pd.read_excel(temp_file_path)
        df_clean = df[selected_cols].dropna().drop_duplicates().reset_index(drop=True)
        df_clean['combined'] = df_clean[selected_cols].astype(str).agg(' '.join, axis=1).str.lower()
        df_clean.to_json(combined_path)

        return Response({
            'message': 'Kolom berhasil digabung',
            'combined_sample': df_clean['combined'].head(5).tolist()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=400)
