import traceback
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from background_task import background
from ..permission import IsSuperadmin, IsEmployee
from ..models import MatchingJob, LabelingData
from ..services.match_engine import MatchingEngine
import uuid
import logging


logger = logging.getLogger(__name__)


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


class GetRecommendedColumnsView(APIView):
    permission_classes = [IsSuperadmin | IsEmployee]
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


# Perbaikan untuk PrepareCombinedDataView di matching_core_views.py
class PrepareCombinedDataView(APIView):
    permission_classes = [IsSuperadmin | IsEmployee]
    
    def post(self, request):
        try:
            # Ambil data dari request
            table_name = request.data.get('table_name')
            selected_columns = request.data.get('selected_columns')
            
            # Log untuk debugging
            logger.info(f"=== PrepareCombinedDataView Debug ===")
            logger.info(f"Request data: {request.data}")
            logger.info(f"Table name: {table_name}")
            logger.info(f"Selected columns: {selected_columns}")
            logger.info(f"User: {request.user}")
            
            # Validasi input
            if not table_name:
                logger.error("table_name is missing from request")
                return Response({'error': 'table_name required'}, status=400)
                
            if not selected_columns:
                logger.error("selected_columns is missing from request")
                return Response({'error': 'selected_columns required'}, status=400)
                
            if not isinstance(selected_columns, list) or len(selected_columns) == 0:
                logger.error(f"selected_columns should be a non-empty list, got: {selected_columns}")
                return Response({'error': 'selected_columns should be a non-empty list'}, status=400)

            # Cek apakah tabel ada di database
            with connection.cursor() as cursor:
                # PostgreSQL: Cek apakah tabel ada menggunakan information_schema
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                """, [table_name])
                table_exists = cursor.fetchone()
                
                if not table_exists:
                    logger.error(f"Table '{table_name}' does not exist")
                    return Response({'error': f'Tabel "{table_name}" tidak ditemukan'}, status=400)
                
                # PostgreSQL: Cek kolom yang ada di tabel menggunakan information_schema
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                    ORDER BY ordinal_position
                """, [table_name])
                columns_info = cursor.fetchall()
                existing_columns = [col[0] for col in columns_info]  # col[0] is column name
                
                logger.info(f"Existing columns in table '{table_name}': {existing_columns}")
                
                # Cek apakah kolom yang dipilih ada di tabel
                missing_columns = [col for col in selected_columns if col not in existing_columns]
                if missing_columns:
                    logger.error(f"Missing columns in table '{table_name}': {missing_columns}")
                    return Response({
                        'error': f'Kolom tidak ditemukan di tabel "{table_name}": {missing_columns}',
                        'existing_columns': existing_columns,
                        'requested_columns': selected_columns
                    }, status=400)
                
                # Cek jumlah data di tabel - menggunakan quoted identifier untuk keamanan
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                row_count = cursor.fetchone()[0]
                logger.info(f"Table '{table_name}' has {row_count} rows")
                
                if row_count == 0:
                    return Response({'error': f'Tabel "{table_name}" kosong (0 baris data)'}, status=400)

            # Initialize matching engine
            try:
                engine = MatchingEngine()
                logger.info("MatchingEngine initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize MatchingEngine: {str(e)}")
                return Response({'error': f'Gagal menginisialisasi engine: {str(e)}'}, status=500)
            
            # Proses data
            try:
                logger.info("Calling engine.prepare_combined_data...")
                df_combined = engine.prepare_combined_data(table_name, selected_columns)
                logger.info(f"prepare_combined_data returned: {type(df_combined)}")
                
                if df_combined is not None:
                    logger.info(f"DataFrame shape: {df_combined.shape}")
                    logger.info(f"DataFrame columns: {list(df_combined.columns)}")
                    logger.info(f"DataFrame head:\n{df_combined.head()}")
                
            except Exception as e:
                logger.error(f"Error in prepare_combined_data: {str(e)}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                return Response({'error': f'Gagal memproses data: {str(e)}'}, status=400)
            
            if df_combined is None:
                logger.error("prepare_combined_data returned None")
                return Response({'error': 'Data kosong atau gagal diproses (returned None)'}, status=400)
                
            if df_combined.empty:
                logger.error("prepare_combined_data returned empty DataFrame")
                return Response({'error': 'Data kosong atau gagal diproses (empty DataFrame)'}, status=400)
            
            # Convert to dict untuk response
            try:
                result_data = df_combined.to_dict(orient='records')
                logger.info(f"Successfully converted to dict with {len(result_data)} records")
            except Exception as e:
                logger.error(f"Error converting DataFrame to dict: {str(e)}")
                return Response({'error': f'Gagal mengkonversi data: {str(e)}'}, status=500)
            
            return Response({
                'data': result_data,
                'message': 'Data berhasil diproses',
                'record_count': len(result_data),
                'table_name': table_name,
                'selected_columns': selected_columns
            })
        
        except Exception as e:
            logger.error(f"Unexpected error in PrepareCombinedDataView: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return Response({'error': f'Internal server error: {str(e)}'}, status=500)

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


class StartMatchingView(APIView):
    permission_classes = [IsSuperadmin | IsEmployee]
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


class GetLabelingDataView(APIView):
    permission_classes = [IsSuperadmin | IsEmployee]
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
    permission_classes = [IsSuperadmin | IsEmployee]
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
    permission_classes = [IsSuperadmin | IsEmployee]
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