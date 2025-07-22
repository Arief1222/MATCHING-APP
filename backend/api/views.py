from rest_framework.decorators import api_view
from background_task import background
from rest_framework.response import Response
from django.http import FileResponse
from django.core.files.storage import default_storage
import os
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
#from .services.match_engine import run_faiss_matching
from django.views.decorators.csrf import csrf_exempt
from .utils.Upload_handler import delete_table_by_name, export_table_to_excel, get_table_data, handle_uploaded_file #get_recommended_columns, process_combined_columns
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
# from django.core.files.storage import default_storage
# from django.core.files.base import ContentFile
import pandas as pd
import uuid
from datetime import datetime
import logging
from .models import DataTable, MatchingResult, LabelingData, MatchingJob
from .services.match_engine import MatchingEngine
from .services.supabase_service import SupabaseService



COMBINED_PATH = "combined.json"
EXPORT_CSV_PATH = "matching_result_faiss_validated.csv"
TEMP_FILE_PATH ="upload.xlxs"
current_progress = {'current': 0, 'total': 1}

class JobStatusView(APIView):
    def get(self, request, job_id):
        try:
            job = MatchingJob.objects.get(job_id=job_id)
            return Response({
                "job_id": job.job_id,
                "table_name": job.table_name,
                "status": job.status,
                "start_time": job.start_time,
                "end_time": job.end_time,
            })
        except MatchingJob.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)
        
class GetAvailableTablesView(APIView):
    def get(self, request):
        try:
            logger.info("=== GetAvailableTablesView Start ===")

            excluded_tables = (
                'auth_group',
                'auth_group_permissions',
                'auth_permission',
                'auth_user',
                'auth_user_groups',
                'auth_user_user_permissions',
                'background_task',
                'background_task_completedtask',
                'django_admin_log',
                'django_content_type',
                'django_migrations',
                'django_session'
            )

            placeholders = ','.join(['%s'] * len(excluded_tables))

            # Query untuk mendapatkan informasi detail tabel
            query = f"""
                SELECT 
                    t.table_name,
                    COALESCE(c.column_count, 0) as column_count,
                    COALESCE(s.n_tup_ins, 0) as estimated_rows,
                    pg_size_pretty(COALESCE(pg_total_relation_size(quote_ident(t.table_name)::regclass), 0)) as table_size,
                    COALESCE(pg_stat_user_tables.last_vacuum, pg_stat_user_tables.last_autovacuum, 
                             pg_stat_user_tables.last_analyze, pg_stat_user_tables.last_autoanalyze) as last_modified
                FROM information_schema.tables t
                LEFT JOIN (
                    SELECT table_name, COUNT(*) as column_count
                    FROM information_schema.columns 
                    WHERE table_schema = 'public'
                    GROUP BY table_name
                ) c ON t.table_name = c.table_name
                LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
                LEFT JOIN pg_stat_user_tables ON t.table_name = pg_stat_user_tables.relname
                WHERE t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
                AND t.table_name NOT IN ({placeholders})
                ORDER BY t.table_name
            """

            with connection.cursor() as cursor:
                cursor.execute(query, excluded_tables)
                result = cursor.fetchall()
            
            tables_list = []
            for row in result:
                table_info = {
                    'name': row[0],
                    'columns': row[1] or 0,
                    'records': row[2] or 0,
                    'size': row[3] or '0 bytes',
                    'last_modified': row[4].isoformat() if row[4] else None,
                    'status': 'active'  # Semua tabel yang ada dianggap aktif
                }
                tables_list.append(table_info)
            
            return Response({
                'tables': tables_list,
                'total': len(tables_list)
            })
        
        except Exception as e:
            logger.error(f"Error in GetAvailableTablesView: {e}", exc_info=True)
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TableManagementView(APIView):
    """
    View untuk CRUD operations pada tabel
    """
    
    def delete(self, request, table_name):
        """
        Menghapus tabel dari database
        """
        try:
            logger.info(f"=== Deleting table: {table_name} ===")
            
            # Validasi nama tabel untuk menghindari SQL injection
            if not self._is_valid_table_name(table_name):
                return Response({
                    'error': 'Invalid table name'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cek apakah tabel ada
            if not self._table_exists(table_name):
                return Response({
                    'error': f'Table {table_name} does not exist'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Cek apakah tabel tidak dalam daftar yang dilindungi
            excluded_tables = {
                'auth_group', 'auth_group_permissions', 'auth_permission',
                'auth_user', 'auth_user_groups', 'auth_user_user_permissions',
                'background_task', 'background_task_completedtask',
                'django_admin_log', 'django_content_type', 'django_migrations',
                'django_session'
            }
            
            if table_name in excluded_tables:
                return Response({
                    'error': f'Table {table_name} is protected and cannot be deleted'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Hapus tabel
            with connection.cursor() as cursor:
                cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
            
            logger.info(f"Table {table_name} deleted successfully")
            
            return Response({
                'message': f'Table {table_name} deleted successfully'
            })
        
        except Exception as e:
            logger.error(f"Error deleting table {table_name}: {e}", exc_info=True)
            return Response({
                'error': f'Failed to delete table: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, table_name):
        """
        Mendapatkan detail tabel tertentu
        """
        try:
            logger.info(f"=== Getting table details: {table_name} ===")
            
            if not self._is_valid_table_name(table_name):
                return Response({
                    'error': 'Invalid table name'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not self._table_exists(table_name):
                return Response({
                    'error': f'Table {table_name} does not exist'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Query untuk mendapatkan detail tabel
            table_info_query = """
                SELECT 
                    t.table_name,
                    t.table_type,
                    COUNT(c.column_name) as column_count,
                    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) as table_size,
                    pg_total_relation_size(quote_ident(t.table_name)::regclass) as table_size_bytes
                FROM information_schema.tables t
                LEFT JOIN information_schema.columns c ON t.table_name = c.table_name 
                    AND t.table_schema = c.table_schema
                WHERE t.table_schema = 'public'
                AND t.table_name = %s
                GROUP BY t.table_name, t.table_type
            """
            
            # Query untuk mendapatkan informasi kolom
            columns_query = """
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = %s
                ORDER BY ordinal_position
            """
            
            # Query untuk mendapatkan statistik tabel
            stats_query = """
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as total_inserts,
                    n_tup_upd as total_updates,
                    n_tup_del as total_deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                WHERE tablename = %s
            """
            
            with connection.cursor() as cursor:
                # Dapatkan info dasar tabel
                cursor.execute(table_info_query, [table_name])
                table_info = cursor.fetchone()
                
                # Dapatkan info kolom
                cursor.execute(columns_query, [table_name])
                columns = cursor.fetchall()
                
                # Dapatkan statistik
                cursor.execute(stats_query, [table_name])
                stats = cursor.fetchone()
                
                # Dapatkan jumlah baris aktual
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                actual_rows = cursor.fetchone()[0]
            
            # Format response
            table_detail = {
                'name': table_info[0] if table_info else table_name,
                'type': table_info[1] if table_info else 'BASE TABLE',
                'column_count': table_info[2] if table_info else 0,
                'size': table_info[3] if table_info else '0 bytes',
                'size_bytes': table_info[4] if table_info else 0,
                'actual_rows': actual_rows,
                'columns': [
                    {
                        'name': col[0],
                        'type': col[1],
                        'nullable': col[2] == 'YES',
                        'default': col[3],
                        'max_length': col[4]
                    } for col in columns
                ],
                'statistics': {
                    'total_inserts': stats[2] if stats else 0,
                    'total_updates': stats[3] if stats else 0,
                    'total_deletes': stats[4] if stats else 0,
                    'live_tuples': stats[5] if stats else 0,
                    'dead_tuples': stats[6] if stats else 0,
                    'last_vacuum': stats[7].isoformat() if stats and stats[7] else None,
                    'last_autovacuum': stats[8].isoformat() if stats and stats[8] else None,
                    'last_analyze': stats[9].isoformat() if stats and stats[9] else None,
                    'last_autoanalyze': stats[10].isoformat() if stats and stats[10] else None,
                } if stats else None
            }
            
            return Response(table_detail)
        
        except Exception as e:
            logger.error(f"Error getting table details {table_name}: {e}", exc_info=True)
            return Response({
                'error': f'Failed to get table details: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _is_valid_table_name(self, table_name):
        """
        Validasi nama tabel untuk menghindari SQL injection
        """
        import re
        # Nama tabel harus terdiri dari huruf, angka, underscore, dan tidak boleh dimulai dengan angka
        pattern = r'^[a-zA-Z_][a-zA-Z0-9_]*$'
        return re.match(pattern, table_name) is not None and len(table_name) <= 63
    
    def _table_exists(self, table_name):
        """
        Cek apakah tabel exists
        """
        query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = %s
            )
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [table_name])
            return cursor.fetchone()[0]


class BulkTableOperationsView(APIView):
    """
    View untuk operasi bulk pada multiple tabel
    """
    
    def delete(self, request):
        """
        Bulk delete multiple tables
        """
        try:
            table_names = request.data.get('table_names', [])
            
            if not table_names or not isinstance(table_names, list):
                return Response({
                    'error': 'table_names must be a non-empty list'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validasi semua nama tabel
            excluded_tables = {
                'auth_group', 'auth_group_permissions', 'auth_permission',
                'auth_user', 'auth_user_groups', 'auth_user_user_permissions',
                'background_task', 'background_task_completedtask',
                'django_admin_log', 'django_content_type', 'django_migrations',
                'django_session'
            }
            
            invalid_tables = []
            protected_tables = []
            missing_tables = []
            
            table_management = TableManagementView()
            
            for table_name in table_names:
                if not table_management._is_valid_table_name(table_name):
                    invalid_tables.append(table_name)
                elif table_name in excluded_tables:
                    protected_tables.append(table_name)
                elif not table_management._table_exists(table_name):
                    missing_tables.append(table_name)
            
            # Return error jika ada masalah dengan tabel
            if invalid_tables or protected_tables or missing_tables:
                error_details = {}
                if invalid_tables:
                    error_details['invalid_tables'] = invalid_tables
                if protected_tables:
                    error_details['protected_tables'] = protected_tables
                if missing_tables:
                    error_details['missing_tables'] = missing_tables
                
                return Response({
                    'error': 'Some tables cannot be deleted',
                    'details': error_details
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Hapus semua tabel yang valid
            deleted_tables = []
            failed_tables = []
            
            for table_name in table_names:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                    deleted_tables.append(table_name)
                    logger.info(f"Table {table_name} deleted successfully")
                except Exception as e:
                    failed_tables.append({'table': table_name, 'error': str(e)})
                    logger.error(f"Failed to delete table {table_name}: {e}")
            
            return Response({
                'message': f'Bulk delete completed',
                'deleted_tables': deleted_tables,
                'failed_tables': failed_tables,
                'total_deleted': len(deleted_tables),
                'total_failed': len(failed_tables)
            })
        
        except Exception as e:
            logger.error(f"Error in bulk delete: {e}", exc_info=True)
            return Response({
                'error': f'Bulk delete failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetRecommendedColumnsView(APIView):
    def post(self, request):
        """Get rekomendasi kolom untuk matching"""
        try:
            table_name = request.data.get('table_name')
            table_b = request.data.get('table_b')  # Optional untuk cross-table matching
            
            if not table_name:
                return Response({'error': 'table_name required'}, status=400)
            
            matching_engine = MatchingEngine()
            
            # Get recommendations untuk table utama
            recommendations = matching_engine.get_recommended_columns(table_name)
            
            result = {
                'table_a_recommendations': recommendations
            }
            
            # Jika ada table_b, berikan rekomendasi mapping
            if table_b:
                column_mapping = matching_engine.recommend_column_mapping(table_name, table_b)
                result['column_mapping_recommendations'] = column_mapping
                result['table_b_recommendations'] = matching_engine.get_recommended_columns(table_b)
            
            return Response(result)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        
logger = logging.getLogger(__name__)

@background(schedule=1)
def run_matching_background(job_id, table_a, table_b, columns_a, columns_b):
    engine = MatchingEngine()
    try:
        engine.run_complete_matching(table_a, table_b, columns_a, columns_b)

        # Setelah sukses:
        engine.update_job_status(job_id=job_id, status="Success")
        logger.info(f"Matching job {job_id} completed successfully.")
    
    except Exception as e:
        # Kalau error:
        engine.update_job_status(job_id=job_id, status="Failed")
        logger.error(f"Matching job {job_id} failed: {str(e)}")
        raise e
    
class MatchingJobListView(APIView):
    def get(self, request):
        jobs = MatchingJob.objects.all().order_by('-start_time')
        return Response([
            {
                "job_id": job.job_id,
                "table_name": job.table_name,
                "status": job.status,
                "start_time": job.start_time,
                "end_time": job.end_time,
            }
            for job in jobs
        ])

class PrepareCombinedDataView(APIView):
    def post(self, request):
        try:
            table_name = request.data.get('table_name')
            selected_columns = request.data.get('selected_columns')
            
            if not table_name or not selected_columns:
                return Response({'error': 'table_name and selected_columns required'}, status=400)

            engine = MatchingEngine()
            df_combined = engine.prepare_combined_data(table_name, selected_columns)
            
            if df_combined is None:
                return Response({'error': 'Data kosong atau gagal diproses'}, status=400)
            
            return Response({'data': df_combined.to_dict(orient='records')})
        
        except Exception as e:
            return Response({'error': str(e)}, status=500)

# API view untuk start matching
class StartMatchingView(APIView):
    def post(self, request):
        """Mulai proses matching secara background"""
        try:
            table_a = request.data.get('table_a')
            table_b = request.data.get('table_b')
            columns_a = request.data.get('columns_a')
            columns_b = request.data.get('columns_b')
           
            
            if not table_a or not columns_a:
                return Response({'error': 'table_a and columns_a required'}, status=400)

            job_id = str(uuid.uuid4())
            
            matching_engine = MatchingEngine()
            matching_engine.save_job_status(job_id, table_a)  # Simpan status 'Pending'

            # Kirim ke background
            run_matching_background(job_id, table_a, table_b, columns_a, columns_b)

            return Response({'job_id': job_id, 'status': 'Pending'})

        except Exception as e:
            return Response({'error': str(e)}, status=500)

class GetMatchingResultsView(APIView):
    def get(self, request):
        """Get hasil matching berdasarkan batch_id"""
        try:
            batch_id = request.query_params.get('batch_id')
            result_type = request.query_params.get('type', 'all')  # all, match, unmatch, enriched
            
            if not batch_id:
                return Response({'error': 'batch_id required'}, status=400)
            
            query = MatchingResult.objects.filter(batch_id=batch_id)
            
            if result_type != 'all':
                query = query.filter(status=result_type.upper())
            
            results = query.values()
            
            return Response({
                'results': list(results),
                'total_count': len(results)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class GetLabelingDataView(APIView):
    def get(self, request):
        """Get data yang perlu dilabeling"""
        try:
            # Get unlabeled data
            unlabeled = LabelingData.objects.filter(
                label__isnull=True
            ).values()
            
            return Response({
                'unlabeled_data': list(unlabeled),
                'total_count': len(unlabeled)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class SubmitLabelingView(APIView):
    def post(self, request):
        """Submit hasil labeling manual"""
        try:
            labeling_id = request.data.get('labeling_id')
            label = request.data.get('label')  # 'MATCH' atau 'UNMATCH'
            
            if not labeling_id or not label:
                return Response({'error': 'labeling_id and label required'}, status=400)
            
            if label not in ['MATCH', 'UNMATCH']:
                return Response({'error': 'label must be MATCH or UNMATCH'}, status=400)
            
            # Update labeling data
            labeling_data = LabelingData.objects.get(id=labeling_id)
            labeling_data.label = label
            labeling_data.confirmed_by = request.user
            labeling_data.save()
            
            return Response({
                'message': 'Labeling submitted successfully',
                'labeling_id': labeling_id,
                'label': label
            })
            
        except LabelingData.DoesNotExist:
            return Response({'error': 'Labeling data not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class RetrainModelView(APIView):
    def post(self, request):
        """Retrain XGBoost model dari data validasi"""
        try:
            matching_engine = MatchingEngine()
            result = matching_engine.train_xgb_from_validasi()
            
            return Response({
                'message': 'Model retrain completed',
                'result': result
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        
class GetMatchingStatsView(APIView):
    def get(self, request):
        """Get statistik matching"""
        try:
            batch_id = request.query_params.get('batch_id')
            
            if batch_id:
                # Stats untuk batch tertentu
                stats = MatchingResult.objects.filter(batch_id=batch_id).values('status').annotate(
                    count=models.Count('id')
                )
                
                # PERBAIKAN: Cek apakah ini self-matching atau cross-matching
                sample_result = MatchingResult.objects.filter(batch_id=batch_id).first()
                matching_type = 'cross_matching'
                if sample_result:
                    matching_type = 'self_matching' if sample_result.source_table == sample_result.reference_table else 'cross_matching'
                
            else:
                # Stats keseluruhan
                stats = MatchingResult.objects.values('status').annotate(
                    count=models.Count('id')
                )
                matching_type = 'all'
            
            # Labeling stats
            labeling_stats = {
                'total_unlabeled': LabelingData.objects.filter(label__isnull=True).count(),
                'total_labeled': LabelingData.objects.filter(label__isnull=False).count(),
                'match_labels': LabelingData.objects.filter(label='MATCH').count(),
                'unmatch_labels': LabelingData.objects.filter(label='UNMATCH').count()
            }
            
            return Response({
                'matching_type': matching_type,
                'matching_stats': list(stats),
                'labeling_stats': labeling_stats
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        


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
        
     