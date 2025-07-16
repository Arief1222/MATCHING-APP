# utils/file_handler.py

import os
import pandas as pd
from django.core.files.storage import default_storage
from rest_framework.response import Response
import pandas as pd
import tempfile
from api.models import SnapwangiData 




def upload_snapwangi(request):
    if 'file' not in request.FILES:
        return Response({'error': 'File tidak ditemukan'}, status=400)

    file = request.FILES['file']

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        for chunk in file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        df = pd.read_excel(tmp_path)
        df = df.dropna(how='all').reset_index(drop=True)

        records = df.to_dict(orient='records')
        for row in records:
            SnapwangiData.objects.create(data=row)

        return Response({'message': f'{len(records)} data berhasil dimasukkan ke Snapwangi'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)



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
