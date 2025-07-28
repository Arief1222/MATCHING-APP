from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import FileResponse
from ..models import MatchingResult
import pandas as pd
import os
from datetime import datetime
import logging


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
            
            # Add additional columns
            df['matching_type'] = df.apply(
                lambda row: 'Self Match' if row['source_table'] == row['reference_table'] else 'Cross Match', 
                axis=1
            )
            
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
                export_path = f'exports/{filename}.xlsx'
                os.makedirs('exports', exist_ok=True)
                
                with pd.ExcelWriter(export_path, engine='openpyxl') as writer:
                    # Main data sheet
                    df.to_excel(writer, sheet_name='Results', index=False)
                    
                    # Summary sheet
                    summary_data = {
                        'Metric': ['Total Records', 'Average Confidence', 'Matching Type', 'Algorithm Used'],
                        'Value': [
                            len(df),
                            df['confidence_score'].mean() if 'confidence_score' in df.columns else 0,
                            df['matching_type'].iloc[0] if len(df) > 0 else 'N/A',
                            ', '.join(df['matching_algorithm'].unique()) if 'matching_algorithm' in df.columns else 'N/A'
                        ]
                    }
                    pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
                
                # Return file
                return FileResponse(
                    open(export_path, 'rb'),
                    as_attachment=True,
                    filename=f'{filename}.xlsx',
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                
            else:  # CSV
                export_path = f'exports/{filename}.csv'
                os.makedirs('exports', exist_ok=True)
                df.to_csv(export_path, index=False)
                
                return FileResponse(
                    open(export_path, 'rb'),
                    as_attachment=True,
                    filename=f'{filename}.csv',
                    content_type='text/csv'
                )
                
        except Exception as e:
            logger.error(f"Error in ExportCategorizedResultsView: {e}", exc_info=True)
            return Response({'error': str(e)}, status=500)