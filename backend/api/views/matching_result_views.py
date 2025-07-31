from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import MatchingResult, LabelingData
from django.db import models
import logging


logger = logging.getLogger(__name__)


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


class GetCategorizedMatchResultsView(APIView):
    def get(self, request):
        try:
            # Parameter filter
            status_filter = request.query_params.get('status', 'MATCH')
            batch_id = request.query_params.get('batch_id')
            source_table = request.query_params.get('source_table')
            reference_table = request.query_params.get('reference_table')
            algorithm = request.query_params.get('algorithm')
            page = int(request.query_params.get('page', 1))
            page_size = min(int(request.query_params.get('page_size', 20)), 100)  # Max 100 per page
            
            # OPTIMASI: Base query dengan select_related untuk mengurangi queries
            query = MatchingResult.objects.filter(
                status=status_filter.upper()
            ).select_related().only(
                'id', 'batch_id', 'source_table', 'reference_table', 
                'matching_algorithm', 'confidence_score', 'created_at', 
                'status', 'matched_data'
            )
            
            # Apply filters
            if batch_id:
                query = query.filter(batch_id=batch_id)
            if source_table:
                query = query.filter(source_table=source_table)
            if reference_table:
                query = query.filter(reference_table=reference_table)
            if algorithm:
                query = query.filter(matching_algorithm=algorithm)
            
            # OPTIMASI: Count query terpisah untuk performa
            total_count = query.count()
            
            # OPTIMASI: Limit query results dan order by index
            offset = (page - 1) * page_size
            results = query.order_by('-id')[offset:offset + page_size]  # Gunakan -id karena lebih cepat dari created_at
            
            # OPTIMASI: Batch serialize tanpa loop individual
            serialized_results = []
            for result in results:
                # Minimal data untuk table view
                serialized_results.append({
                    'id': result.id,
                    'batch_id': result.batch_id,
                    'source_table': result.source_table,
                    'reference_table': result.reference_table,
                    'matching_algorithm': result.matching_algorithm,
                    'confidence_score': float(result.confidence_score) if result.confidence_score else 0,
                    'created_at': result.created_at.isoformat(),
                    'status': result.status,
                    'matching_type': 'Self Match' if result.source_table == result.reference_table else 'Cross Match',
                    # Jangan kirim matched_data di list view untuk menghemat bandwidth
                })
            
            # OPTIMASI: Get categories hanya jika diperlukan
            include_categories = request.query_params.get('include_categories', 'false').lower() == 'true'
            categories = self.get_categories(status_filter.upper()) if include_categories else {}
            
            return Response({
                'results': serialized_results,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size,
                    'has_next': page * page_size < total_count,
                    'has_prev': page > 1
                },
                'categories': categories,
                'filters_applied': {
                    'status': status_filter.upper(),
                    'batch_id': batch_id,
                    'source_table': source_table,
                    'reference_table': reference_table,
                    'algorithm': algorithm
                }
            })
            
        except Exception as e:
            logger.error(f"Error in GetCategorizedMatchResultsView: {e}", exc_info=True)
            return Response({'error': str(e)}, status=500)


# TAMBAHAN: View terpisah untuk mendapatkan categories saja
class GetCategoriesView(APIView):
    """View terpisah untuk mendapatkan filter categories"""
    
    def get(self, request):
        try:
            status_filter = request.query_params.get('status', 'MATCH')
            categories = self.get_categories(status_filter.upper())
            return Response({'categories': categories})
        except Exception as e:
            logger.error(f"Error in GetCategoriesView: {e}", exc_info=True)
            return Response({'error': str(e)}, status=500)
    
    def get_categories(self, status_filter):
        """Optimized categories query"""
        try:
            # OPTIMASI: Query dengan agregasi yang lebih efisien
            unique_combinations = MatchingResult.objects.filter(
                status=status_filter
            ).values(
                'batch_id', 'source_table', 'reference_table', 'matching_algorithm'
            ).annotate(
                count=models.Count('id'),
                avg_confidence=models.Avg('confidence_score'),
                latest_date=models.Max('created_at')
            ).order_by('-latest_date')[:50]  # Limit untuk performa
            
            # Simplified processing
            algorithms = set()
            batch_ids = set()
            source_tables = set()
            reference_tables = set()
            
            for combo in unique_combinations:
                algorithms.add(combo['matching_algorithm'])
                batch_ids.add(combo['batch_id'])
                source_tables.add(combo['source_table'])
                reference_tables.add(combo['reference_table'])
            
            return {
                'unique_algorithms': sorted(list(algorithms)),
                'unique_batch_ids': sorted(list(batch_ids), reverse=True)[:20],  # Latest 20 only
                'unique_source_tables': sorted(list(source_tables)),
                'unique_reference_tables': sorted(list(reference_tables))
            }
            
        except Exception as e:
            logger.error(f"Error getting categories: {e}", exc_info=True)
            return {}


# TAMBAHAN: View untuk detail individual (untuk modal)
class GetMatchResultDetailView(APIView):
    """View untuk mendapatkan detail result individual"""
    
    def get(self, request, result_id):
        try:
            result = MatchingResult.objects.get(id=result_id)
            
            detail_data = {
                'id': result.id,
                'batch_id': result.batch_id,
                'source_table': result.source_table,
                'reference_table': result.reference_table,
                'matching_algorithm': result.matching_algorithm,
                'matched_data': result.matched_data,  # Full data untuk detail
                'confidence_score': float(result.confidence_score) if result.confidence_score else 0,
                'created_at': result.created_at.isoformat(),
                'status': result.status,
                'matching_type': 'Self Match' if result.source_table == result.reference_table else 'Cross Match'
            }
            
            return Response({'result': detail_data})
            
        except MatchingResult.DoesNotExist:
            return Response({'error': 'Result not found'}, status=404)
        except Exception as e:
            logger.error(f"Error in GetMatchResultDetailView: {e}", exc_info=True)
            return Response({'error': str(e)}, status=500)
        
class GetMatchingSummaryView(APIView):
    """
    View untuk mendapatkan summary hasil matching
    """
    
    def get(self, request):
        try:
            # Get summary statistics
            total_matches = MatchingResult.objects.filter(status='MATCH').count()
            total_unmatches = MatchingResult.objects.filter(status='UNMATCH').count()
            total_enriched = MatchingResult.objects.filter(status='ENRICHED').count()
            
            # Get algorithm performance
            algorithm_stats = MatchingResult.objects.values('matching_algorithm').annotate(
                total_count=models.Count('id'),
                match_count=models.Count('id', filter=models.Q(status='MATCH')),
                unmatch_count=models.Count('id', filter=models.Q(status='UNMATCH')),
                avg_confidence=models.Avg('confidence_score')
            )
            
            # Get table pair statistics
            table_pair_stats = MatchingResult.objects.values(
                'source_table', 'reference_table'
            ).annotate(
                total_count=models.Count('id'),
                match_count=models.Count('id', filter=models.Q(status='MATCH')),
                unmatch_count=models.Count('id', filter=models.Q(status='UNMATCH')),
                avg_confidence=models.Avg('confidence_score'),
                latest_run=models.Max('created_at')
            ).order_by('-latest_run')
            
            # Format table pair stats
            formatted_table_stats = []
            for stat in table_pair_stats:
                matching_type = 'Self Match' if stat['source_table'] == stat['reference_table'] else 'Cross Match'
                display_name = stat['source_table'] if matching_type == 'Self Match' else f"{stat['source_table']} ↔ {stat['reference_table']}"
                
                formatted_table_stats.append({
                    'display_name': display_name,
                    'source_table': stat['source_table'],
                    'reference_table': stat['reference_table'],
                    'matching_type': matching_type,
                    'total_count': stat['total_count'],
                    'match_count': stat['match_count'],
                    'unmatch_count': stat['unmatch_count'],
                    'match_rate': round((stat['match_count'] / stat['total_count']) * 100, 2) if stat['total_count'] > 0 else 0,
                    'avg_confidence': round(stat['avg_confidence'], 2) if stat['avg_confidence'] else 0,
                    'latest_run': stat['latest_run'].isoformat() if stat['latest_run'] else None
                })
            
            # Get recent activity
            recent_activities = MatchingResult.objects.order_by('-created_at')[:10].values(
                'batch_id', 'source_table', 'reference_table', 'matching_algorithm', 
                'status', 'confidence_score', 'created_at'
            )
            
            formatted_recent = []
            for activity in recent_activities:
                matching_type = 'Self Match' if activity['source_table'] == activity['reference_table'] else 'Cross Match'
                display_name = activity['source_table'] if matching_type == 'Self Match' else f"{activity['source_table']} ↔ {activity['reference_table']}"
                
                formatted_recent.append({
                    'display_name': display_name,
                    'matching_type': matching_type,
                    'algorithm': activity['matching_algorithm'],
                    'status': activity['status'],
                    'confidence_score': activity['confidence_score'],
                    'created_at': activity['created_at'].isoformat(),
                    'batch_id': activity['batch_id']
                })
            
            return Response({
                'overview': {
                    'total_matches': total_matches,
                    'total_unmatches': total_unmatches,
                    'total_enriched': total_enriched,
                    'total_records': total_matches + total_unmatches + total_enriched
                },
                'algorithm_performance': list(algorithm_stats),
                'table_pair_statistics': formatted_table_stats,
                'recent_activities': formatted_recent
            })
            
        except Exception as e:
            logger.error(f"Error in GetMatchingSummaryView: {e}", exc_info=True)
            return Response({'error': str(e)}, status=500)