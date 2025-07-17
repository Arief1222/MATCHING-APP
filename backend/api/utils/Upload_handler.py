import os
from rest_framework.response import Response
from io import BytesIO
import pandas as pd
from django.http import HttpResponse
import numpy as np
from django.db import connection


def create_table_if_not_exists(table_name, columns):
    with connection.cursor() as cursor:
        col_defs = []
        for col in columns:
            # Buat semua kolom jadi tipe TEXT dulu
            safe_col = col.replace('"', '""')
            col_defs.append(f'"{safe_col}" TEXT')
        col_sql = ', '.join(col_defs)
        sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" ({col_sql});'
        cursor.execute(sql)

def insert_records_raw(table_name, records, batch_size=10000):
    if not records:
        return

    columns = records[0].keys()
    col_str = ', '.join(f'"{col}"' for col in columns)

    with connection.cursor() as cursor:
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            values_str = ', '.join(
                cursor.mogrify(
                    f"({', '.join(['%s'] * len(columns))})",
                    tuple(str(row[col]) if row[col] is not None else None for col in columns)
                ).decode()
                for row in batch
            )
            sql = f'INSERT INTO "{table_name}" ({col_str}) VALUES {values_str};'
            try:
                cursor.execute(sql)
                print(f"✅ Batch {i//batch_size + 1} berhasil dimasukkan.")
            except Exception as e:
                print(f"❌ Error insert batch ke-{i//batch_size + 1}: {e}")
                raise e

def handle_uploaded_file(request, temp_file_path, table_name):
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=400)

    file = request.FILES['file']
    print(f"✅ File diterima: {file.name} untuk tabel: {table_name}")

    # Simpan ke file sementara
    with open(temp_file_path, 'wb+') as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    try:
        df = pd.read_excel(temp_file_path)
        df = df.dropna(how='all').reset_index(drop=True)
        df.columns = df.columns.str.strip()
        df = df.replace({np.nan: None})

        records = df.to_dict(orient='records')

        # Buat tabel kalau belum ada
        create_table_if_not_exists(table_name, df.columns)

        # Insert data secara batch
        insert_records_raw(table_name, records)

        return Response({
            'message': f'{len(records)} data berhasil dimasukkan ke tabel {table_name}',
            'columns': list(df.columns)
        })

    except Exception as e:
        print(f"❌ ERROR: {e}")
        return Response({'error': str(e)}, status=500)

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
def get_table_data(request):
    table_name = request.GET.get('table_name')
    if not table_name:
        return Response({'error': 'Parameter table_name wajib disertakan'}, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute(f'SELECT * FROM "{table_name}"')
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            data = [dict(zip(columns, row)) for row in rows]
        return Response({'columns': columns, 'data': data})
    except Exception as e:
        return Response({'error': str(e)}, status=500)   
    
    
def delete_table_by_name(request):
    table_name = request.GET.get('table_name')
    
    if not table_name:
        return Response({'error': 'Parameter table_name wajib disertakan'}, status=400)
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        return Response({'message': f'Tabel {table_name} berhasil dihapus.'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)
    
    
def export_table_to_excel(request):
    table_name = request.GET.get('table_name')
    if not table_name:
        return Response({'error': 'Parameter table_name wajib disertakan'}, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute(f'SELECT * FROM "{table_name}"')
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            df = pd.DataFrame(rows, columns=columns)

        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Data', index=False)

        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename={table_name}.xlsx'
        return response

    except Exception as e:
        return Response({'error': str(e)}, status=500)   


# def get_recommended_columns(temp_file_path):
#     if not os.path.exists(temp_file_path):
#         return Response({'error': 'File belum diupload'}, status=400)

#     try:
#         df = pd.read_excel(temp_file_path)
#         rekomendasi = []

#         for col in df.columns:
#             if df[col].dtype == 'object':
#                 if df[col].notnull().mean() > 0.8 and df[col].dropna().astype(str).str.len().mean() > 3 and df[col].nunique() > 10:
#                     rekomendasi.append(col)

#         return Response({'recommended_columns': rekomendasi})
#     except Exception as e:
#         return Response({'error': str(e)}, status=500)


# def process_combined_columns(request, temp_file_path, combined_path):
#     selected_cols = request.data.get('columns', [])

#     if not selected_cols:
#         return Response({'error': 'No columns selected'}, status=400)
#     if not os.path.exists(temp_file_path):
#         return Response({'error': 'No file uploaded yet'}, status=400)

#     try:
#         df = pd.read_excel(temp_file_path)
#         df_clean = df[selected_cols].dropna().drop_duplicates().reset_index(drop=True)
#         df_clean['combined'] = df_clean[selected_cols].astype(str).agg(' '.join, axis=1).str.lower()
#         df_clean.to_json(combined_path)

#         return Response({
#             'message': 'Kolom berhasil digabung',
#             'combined_sample': df_clean['combined'].head(5).tolist()
#         })
#     except Exception as e:
#         return Response({'error': str(e)}, status=400)
    
