# backend/api/views/matching_export_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import FileResponse, HttpResponse
from ..models import MatchingResult
import pandas as pd
import os
from datetime import datetime
import logging
import tempfile


logger = logging.getLogger(__name__)


class ExportCategorizedResultsView(APIView):
    """
    View untuk export hasil matching berdasarkan kategori
    """
    
    def post(self, request):
        try:
            # Parameter untuk export
            status_filter = request.data.get('status', 'MATCH')
            batch_id = request.data.get('batch_id')
            source_table = request.data.get('source_table')
            reference_table = request.data.get('reference_table')
            algorithm = request.data.get('algorithm')
            format_type = request.data.get('format', 'excel')  # excel atau csv
            
            # Build query
            query = MatchingResult.objects.filter(status=status_filter.upper())
            
            if batch_id:
                query = query.filter(batch_id=batch_id)
            if source_table:
                query = query.filter(source_table=source_table)
            if reference_table:
                query = query.filter(reference_table=reference_table)
            if algorithm:
                query = query.filter(matching_algorithm=algorithm)
            
            # Get data
            results = query.order_by('-created_at').values()
            
            if not results:
                return Response({'error': 'No data found for export'}, status=400)
            
            # Create DataFrame
            df = pd.DataFrame(list(results))
            
            # Fix confidence_score column if it exists
            if 'confidence_score' in df.columns:
                df['confidence_score'] = pd.to_numeric(df['confidence_score'], errors='coerce').fillna(0)
            
            # Add additional columns
            df['matching_type'] = df.apply(
                lambda row: 'Self Match' if row['source_table'] == row['reference_table'] else 'Cross Match', 
                axis=1
            )
            
            # Convert datetime columns for better Excel compatibility
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at']).dt.strftime('%Y-%m-%d %H:%M:%S')
            
            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename_parts = [status_filter.lower(), 'results', timestamp]
            
            if source_table and reference_table:
                if source_table == reference_table:
                    filename_parts.insert(-1, f'self_{source_table}')
                else:
                    filename_parts.insert(-1, f'{source_table}_to_{reference_table}')
            
            filename = '_'.join(filename_parts)
            
            # Export based on format
            if format_type == 'excel':
                # Use temporary file for better memory management
                with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                    export_path = tmp_file.name
                
                try:
                    with pd.ExcelWriter(export_path, engine='openpyxl') as writer:
                        # Main data sheet - limit columns for readability
                        export_columns = [
                            'id', 'batch_id', 'source_table', 'reference_table',
                            'matching_algorithm', 'confidence_score', 'status',
                            'matching_type', 'created_at'
                        ]
                        
                        # Only include columns that exist in the dataframe
                        available_columns = [col for col in export_columns if col in df.columns]
                        df[available_columns].to_excel(writer, sheet_name='Results', index=False)
                        
                        # Summary sheet
                        summary_data = {
                            'Metric': [
                                'Total Records',
                                'Average Confidence',
                                'Matching Type Distribution',
                                'Algorithm Used',
                                'Export Date',
                                'Status Filter'
                            ],
                            'Value': [
                                len(df),
                                f"{df['confidence_score'].mean():.3f}" if 'confidence_score' in df.columns else 'N/A',
                                ', '.join(df['matching_type'].value_counts().to_dict().keys()) if 'matching_type' in df.columns else 'N/A',
                                ', '.join(df['matching_algorithm'].unique()) if 'matching_algorithm' in df.columns else 'N/A',
                                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                status_filter.upper()
                            ]
                        }
                        pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
                
                    # Return file
                    response = FileResponse(
                        open(export_path, 'rb'),
                        as_attachment=True,
                        filename=f'{filename}.xlsx',
                        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    )
                    
                    # Clean up temp file after response is sent
                    def cleanup():
                        try:
                            os.unlink(export_path)
                        except:
                            pass
                    
                    response.cleanup = cleanup
                    return response
                    
                except Exception as e:
                    # Clean up on error
                    try:
                        os.unlink(export_path)
                    except:
                        pass
                    raise e
                
            else:  # CSV
                # Use temporary file for CSV as well
                with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w', encoding='utf-8') as tmp_file:
                    export_path = tmp_file.name
                
                try:
                    # Export only essential columns for CSV
                    export_columns = [
                        'id', 'batch_id', 'source_table', 'reference_table',
                        'matching_algorithm', 'confidence_score', 'status',
                        'matching_type', 'created_at'
                    ]
                    
                    # Only include columns that exist in the dataframe
                    available_columns = [col for col in export_columns if col in df.columns]
                    df[available_columns].to_csv(export_path, index=False, encoding='utf-8')
                    
                    response = FileResponse(
                        open(export_path, 'rb'),
                        as_attachment=True,
                        filename=f'{filename}.csv',
                        content_type='text/csv'
                    )
                    
                    # Clean up temp file after response is sent
                    def cleanup():
                        try:
                            os.unlink(export_path)
                        except:
                            pass
                    
                    response.cleanup = cleanup
                    return response
                    
                except Exception as e:
                    # Clean up on error
                    try:
                        os.unlink(export_path)
                    except:
                        pass
                    raise e
                
        except Exception as e:
            logger.error(f"Error in ExportCategorizedResultsView: {e}", exc_info=True)
            return Response({'error': str(e)}, status=500)


class ExportAllResultsView(APIView):
    """
    View untuk export semua hasil matching
    """
    
    def post(self, request):
        try:
            # Parameter untuk export
            format_type = request.data.get('format', 'excel')
            batch_id = request.data.get('batch_id')
            source_table = request.data.get('source_table')
            reference_table = request.data.get('reference_table')
            algorithm = request.data.get('algorithm')
            status = request.data.get('status')  # Optional status filter
            
            # Build query - no default status filter
            query = MatchingResult.objects.all()
            
            if batch_id:
                query = query.filter(batch_id=batch_id)
            if source_table:
                query = query.filter(source_table=source_table)
            if reference_table:
                query = query.filter(reference_table=reference_table)
            if algorithm:
                query = query.filter(matching_algorithm=algorithm)
            if status:
                query = query.filter(status=status.upper())
            
            # Limit export for performance (max 10,000 records)
            total_count = query.count()
            if total_count > 10000:
                return Response({
                    'error': f'Too many records to export ({total_count}). Please apply more specific filters. Maximum allowed: 10,000 records.'
                }, status=400)
            
            if total_count == 0:
                return Response({'error': 'No data found for export'}, status=400)
            
            # Get data
            results = query.order_by('-created_at').values()
            
            # Create DataFrame
            df = pd.DataFrame(list(results))
            
            # Fix confidence_score column if it exists
            if 'confidence_score' in df.columns:
                df['confidence_score'] = pd.to_numeric(df['confidence_score'], errors='coerce').fillna(0)
            
            # Add additional columns
            df['matching_type'] = df.apply(
                lambda row: 'Self Match' if row['source_table'] == row['reference_table'] else 'Cross Match', 
                axis=1
            )
            
            # Convert datetime columns
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at']).dt.strftime('%Y-%m-%d %H:%M:%S')
            
            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename_parts = ['all_matching_results', timestamp]
            
            if status:
                filename_parts.insert(-1, status.lower())
            
            filename = '_'.join(filename_parts)
            
            # Export based on format
            if format_type == 'excel':
                # Use temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                    export_path = tmp_file.name
                
                try:
                    with pd.ExcelWriter(export_path, engine='openpyxl') as writer:
                        # Main data sheet
                        export_columns = [
                            'id', 'batch_id', 'source_table', 'reference_table',
                            'matching_algorithm', 'confidence_score', 'status',
                            'matching_type', 'created_at'
                        ]
                        
                        available_columns = [col for col in export_columns if col in df.columns]
                        df[available_columns].to_excel(writer, sheet_name='All_Results', index=False)
                        
                        # Summary sheet by status
                        if 'status' in df.columns:
                            status_summary = df['status'].value_counts().reset_index()
                            status_summary.columns = ['Status', 'Count']
                            status_summary.to_excel(writer, sheet_name='Status_Summary', index=False)
                        
                        # Summary sheet by algorithm
                        if 'matching_algorithm' in df.columns:
                            algo_summary = df['matching_algorithm'].value_counts().reset_index()
                            algo_summary.columns = ['Algorithm', 'Count']
                            algo_summary.to_excel(writer, sheet_name='Algorithm_Summary', index=False)
                
                    response = FileResponse(
                        open(export_path, 'rb'),
                        as_attachment=True,
                        filename=f'{filename}.xlsx',
                        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    )
                    
                    def cleanup():
                        try:
                            os.unlink(export_path)
                        except:
                            pass
                    
                    response.cleanup = cleanup
                    return response
                    
                except Exception as e:
                    try:
                        os.unlink(export_path)
                    except:
                        pass
                    raise e
                
            else:  # CSV
                with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w', encoding='utf-8') as tmp_file:
                    export_path = tmp_file.name
                
                try:
                    export_columns = [
                        'id', 'batch_id', 'source_table', 'reference_table',
                        'matching_algorithm', 'confidence_score', 'status',
                        'matching_type', 'created_at'
                    ]
                    
                    available_columns = [col for col in export_columns if col in df.columns]
                    df[available_columns].to_csv(export_path, index=False, encoding='utf-8')
                    
                    response = FileResponse(
                        open(export_path, 'rb'),
                        as_attachment=True,
                        filename=f'{filename}.csv',
                        content_type='text/csv'
                    )
                    
                    def cleanup():
                        try:
                            os.unlink(export_path)
                        except:
                            pass
                    
                    response.cleanup = cleanup
                    return response
                    
                except Exception as e:
                    try:
                        os.unlink(export_path)
                    except:
                        pass
                    raise e
                
        except Exception as e:
            logger.error(f"Error in ExportAllResultsView: {e}", exc_info=True)
            return Response({'error': str(e)}, status=500)