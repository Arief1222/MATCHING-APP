# backend/api/views/employee_labeling_views.py
from rest_framework.views import APIView
from django.db import transaction
import math
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import connection
from ..models import Assignment, EmployeeAssignment, LabelingData
from ..permission import IsEmployee
import logging

logger = logging.getLogger(__name__)

class EmployeeLabelingDataView(APIView):
    """
    View untuk mendapatkan data labeling yang ditugaskan kepada employee tertentu
    """
    permission_classes = [IsAuthenticated, IsEmployee]
    
    def get(self, request):
        try:
            # Pagination parameters
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 50))  # Default 50 item per page
            offset = (page - 1) * page_size
            
            # Assignment filter (optional - untuk load specific assignment)
            assignment_id = request.GET.get('assignment_id')
            
            logger.info(f"Employee {request.user.username} requesting page {page} (size: {page_size})")
            
            # Base query untuk employee assignments
            employee_assignments_query = EmployeeAssignment.objects.filter(
                employee=request.user,
                assignment__status__in=['sent', 'in_progress']
            ).select_related('assignment')
            
            # Filter by specific assignment if provided
            if assignment_id:
                employee_assignments_query = employee_assignments_query.filter(
                    assignment_id=assignment_id
                )
            
            employee_assignments = employee_assignments_query.all()
            
            if not employee_assignments.exists():
                return Response({
                    'message': 'Tidak ada assignment yang ditugaskan kepada Anda',
                    'unlabeled_data': [],
                    'pagination': {
                        'current_page': page,
                        'page_size': page_size,
                        'total_items': 0,
                        'total_pages': 0,
                        'has_next': False,
                        'has_previous': False
                    },
                    'assignments': []
                })
            
            # Hitung total data available dan ambil data dengan pagination
            all_labeling_data = []
            total_available_items = 0
            assignment_summary = []
            
            with connection.cursor() as cursor:
                # Hitung total items available untuk semua assignments
                for emp_assignment in employee_assignments:
                    assignment = emp_assignment.assignment
                    
                    # Count available data for this assignment
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM table_labeling 
                        WHERE assignment_id = %s 
                        AND (confirmed_by_id IS NULL OR confirmed_by_id != %s)
                    """, [assignment.id, request.user.id])
                    
                    available_count = cursor.fetchone()[0]
                    # Batasi dengan data_count dari employee assignment
                    available_count = min(available_count, emp_assignment.data_count)
                    total_available_items += available_count
                    
                    # Assignment summary
                    completed_count = LabelingData.objects.filter(
                        assignment=assignment,
                        confirmed_by=request.user
                    ).count()
                    
                    assignment_info = {
                        'assignment_id': assignment.id,
                        'assignment_title': assignment.title,
                        'description': assignment.description,
                        'total_data': emp_assignment.data_count,
                        'completed_data': completed_count,
                        'available_data': available_count,
                        'progress_percentage': round((completed_count / emp_assignment.data_count * 100) if emp_assignment.data_count > 0 else 0, 2),
                        'status': assignment.status
                    }
                    assignment_summary.append(assignment_info)
                
                # Ambil data dengan pagination (gabungan dari semua assignments)
                current_offset = offset
                remaining_limit = page_size
                
                for emp_assignment in employee_assignments:
                    if remaining_limit <= 0:
                        break
                        
                    assignment = emp_assignment.assignment
                    
                    # Hitung berapa data available untuk assignment ini
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM table_labeling 
                        WHERE assignment_id = %s 
                        AND (confirmed_by_id IS NULL OR confirmed_by_id != %s)
                    """, [assignment.id, request.user.id])
                    
                    assignment_available = cursor.fetchone()[0]
                    assignment_available = min(assignment_available, emp_assignment.data_count)
                    
                    # Skip jika offset masih lebih besar dari data assignment ini
                    if current_offset >= assignment_available:
                        current_offset -= assignment_available
                        continue
                    
                    # Ambil data dari assignment ini
                    assignment_limit = min(remaining_limit, assignment_available - current_offset)
                    
                    query = """
                        SELECT 
                            id,
                            data_id,
                            combined_string_1,
                            combined_string_2,
                            source_table,
                            reference_table,
                            created_at
                        FROM table_labeling 
                        WHERE assignment_id = %s 
                        AND (confirmed_by_id IS NULL OR confirmed_by_id != %s)
                        ORDER BY id ASC
                        OFFSET %s LIMIT %s
                    """
                    
                    cursor.execute(query, [
                        assignment.id,
                        request.user.id,
                        emp_assignment.start_index + current_offset,
                        assignment_limit
                    ])
                    
                    rows = cursor.fetchall()
                    
                    # Convert ke format frontend
                    for row in rows:
                        labeling_item = {
                            'id': row[0],
                            'data_id': row[1],
                            'combined_string_1': row[2],
                            'combined_string_2': row[3],
                            'source_table': row[4],
                            'reference_table': row[5],
                            'created_at': row[6].strftime('%Y-%m-%d %H:%M:%S') if row[6] else None,
                            'assignment_id': assignment.id,
                            'assignment_title': assignment.title
                        }
                        all_labeling_data.append(labeling_item)
                    
                    remaining_limit -= len(rows)
                    current_offset = 0  # Reset offset untuk assignment berikutnya
            
            # Pagination info
            total_pages = (total_available_items + page_size - 1) // page_size if page_size > 0 else 0
            has_next = page < total_pages
            has_previous = page > 1
            
            # Summary statistik
            total_assigned = sum(info['total_data'] for info in assignment_summary)
            total_completed = sum(info['completed_data'] for info in assignment_summary)
            
            logger.info(f"Returned {len(all_labeling_data)} items for page {page}")
            
            return Response({
                'message': f'Data berhasil dimuat (halaman {page})',
                'unlabeled_data': all_labeling_data,
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total_items': total_available_items,
                    'total_pages': total_pages,
                    'has_next': has_next,
                    'has_previous': has_previous
                },
                'assignments': assignment_summary,
                'summary': {
                    'total_assigned': total_assigned,
                    'total_completed': total_completed,
                    'total_available': total_available_items,
                    'overall_progress': round((total_completed / total_assigned * 100) if total_assigned > 0 else 0, 2)
                },
                'employee_info': {
                    'username': request.user.username,
                    'email': request.user.email,
                    'total_assignments': len(employee_assignments)
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting labeling data: {e}", exc_info=True)
            return Response({
                'error': f'Failed to get labeling data: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EmployeeSubmitBatchLabelingView(APIView):
    """
    View untuk employee submit hasil labeling secara batch
    """
    permission_classes = [IsAuthenticated, IsEmployee]
    
    @transaction.atomic
    def post(self, request):
        try:
            labeled_items = request.data.get('labeled_items', [])
            
            if not labeled_items:
                return Response({
                    'error': 'Tidak ada data yang dipilih untuk dilabeling'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Employee {request.user.username} submitting batch labeling for {len(labeled_items)} items")
            
            success_count = 0
            failed_items = []
            
            for item in labeled_items:
                labeling_id = item.get('labeling_id')
                label = item.get('label')  # 'MATCH' atau 'UNMATCH'
                
                # Validasi item
                if not labeling_id or not label:
                    failed_items.append({
                        'labeling_id': labeling_id,
                        'error': 'labeling_id dan label harus diisi'
                    })
                    continue
                
                if label not in ['MATCH', 'UNMATCH']:
                    failed_items.append({
                        'labeling_id': labeling_id,
                        'error': 'Label harus MATCH atau UNMATCH'
                    })
                    continue
                
                try:
                    # Ambil data labeling
                    labeling_data = LabelingData.objects.get(id=labeling_id)
                    
                    # Cek apakah employee ini berhak melabeling data ini
                    if labeling_data.assignment:
                        employee_assignment = EmployeeAssignment.objects.filter(
                            assignment=labeling_data.assignment,
                            employee=request.user
                        ).first()
                        
                        if not employee_assignment:
                            failed_items.append({
                                'labeling_id': labeling_id,
                                'error': 'Anda tidak memiliki akses untuk melabeling data ini'
                            })
                            continue
                    
                    # Cek apakah data sudah dilabeling
                    if labeling_data.confirmed_by:
                        failed_items.append({
                            'labeling_id': labeling_id,
                            'error': f'Data ini sudah dilabeling oleh {labeling_data.confirmed_by.username}'
                        })
                        continue
                    
                    # Update data labeling - HANYA UPDATE STATUS, TIDAK HAPUS
                    labeling_data.label = label
                    labeling_data.confirmed_by = request.user
                    labeling_data.save()
                    
                    success_count += 1
                    
                except LabelingData.DoesNotExist:
                    failed_items.append({
                        'labeling_id': labeling_id,
                        'error': f'Data labeling dengan ID {labeling_id} tidak ditemukan'
                    })
                    continue
                except Exception as e:
                    failed_items.append({
                        'labeling_id': labeling_id,
                        'error': f'Error processing item: {str(e)}'
                    })
                    continue
            
            # Update progress untuk semua assignment yang terlibat
            updated_assignments = set()
            for item in labeled_items:
                if item.get('labeling_id'):
                    try:
                        labeling_data = LabelingData.objects.get(id=item.get('labeling_id'))
                        if labeling_data.assignment and labeling_data.assignment.id not in updated_assignments:
                            assignment = labeling_data.assignment
                            
                            # Update employee assignment progress
                            employee_assignment = EmployeeAssignment.objects.get(
                                assignment=assignment,
                                employee=request.user
                            )
                            
                            # Hitung ulang completed count
                            completed_count = LabelingData.objects.filter(
                                assignment=assignment,
                                confirmed_by=request.user
                            ).count()
                            
                            employee_assignment.completed_count = completed_count
                            
                            # Mark sebagai started jika belum
                            if not employee_assignment.is_started:
                                employee_assignment.is_started = True
                            
                            employee_assignment.save()
                            
                            # Auto update assignment status ke in_progress jika masih sent
                            if assignment.status == 'sent':
                                assignment.status = 'in_progress'
                                assignment.save()
                                logger.info(f"Auto updated assignment {assignment.id} status: sent → in_progress")
                            
                            updated_assignments.add(assignment.id)
                    except:
                        continue
            
            logger.info(f"Batch labeling completed: {success_count} success, {len(failed_items)} failed")
            
            return Response({
                'message': f'Batch labeling selesai: {success_count} berhasil, {len(failed_items)} gagal',
                'success_count': success_count,
                'failed_count': len(failed_items),
                'failed_items': failed_items,
                'total_processed': len(labeled_items)
            })
            
        except Exception as e:
            logger.error(f"Error in batch labeling: {e}", exc_info=True)
            return Response({
                'error': f'Failed to process batch labeling: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Keep existing single submit view for backward compatibility
# class EmployeeSubmitLabelingView(APIView):
#     """
#     View untuk employee submit hasil labeling (single item)
#     """
#     permission_classes = [IsAuthenticated, IsEmployee]
    
#     def post(self, request):
#         try:
#             labeling_id = request.data.get('labeling_id')
#             label = request.data.get('label')  # 'MATCH' atau 'UNMATCH'
            
#             logger.info(f"Employee {request.user.username} submitting label for ID {labeling_id}: {label}")
            
#             # Validasi input
#             if not labeling_id or not label:
#                 return Response({
#                     'error': 'labeling_id dan label harus diisi'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             if label not in ['MATCH', 'UNMATCH']:
#                 return Response({
#                     'error': 'Label harus MATCH atau UNMATCH'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Ambil data labeling
#             try:
#                 labeling_data = LabelingData.objects.get(id=labeling_id)
#             except LabelingData.DoesNotExist:
#                 return Response({
#                     'error': f'Data labeling dengan ID {labeling_id} tidak ditemukan'
#                 }, status=status.HTTP_404_NOT_FOUND)
            
#             # Cek apakah employee ini berhak melabeling data ini
#             if labeling_data.assignment:
#                 employee_assignment = EmployeeAssignment.objects.filter(
#                     assignment=labeling_data.assignment,
#                     employee=request.user
#                 ).first()
                
#                 if not employee_assignment:
#                     return Response({
#                         'error': 'Anda tidak memiliki akses untuk melabeling data ini'
#                     }, status=status.HTTP_403_FORBIDDEN)
            
#             # Cek apakah data sudah dilabeling
#             if labeling_data.confirmed_by:
#                 return Response({
#                     'error': f'Data ini sudah dilabeling oleh {labeling_data.confirmed_by.username}'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Update data labeling - HANYA UPDATE STATUS, TIDAK HAPUS
#             labeling_data.label = label
#             labeling_data.confirmed_by = request.user
#             labeling_data.save()
            
#             # Update progress pada employee assignment jika ada
#             if labeling_data.assignment:
#                 employee_assignment = EmployeeAssignment.objects.get(
#                     assignment=labeling_data.assignment,
#                     employee=request.user
#                 )
                
#                 # Hitung ulang completed count
#                 completed_count = LabelingData.objects.filter(
#                     assignment=labeling_data.assignment,
#                     confirmed_by=request.user
#                 ).count()
                
#                 employee_assignment.completed_count = completed_count
                
#                 # Mark sebagai started jika belum
#                 if not employee_assignment.is_started:
#                     employee_assignment.is_started = True
                
#                 employee_assignment.save()
                
#                 # Auto update assignment status ke in_progress jika masih sent
#                 assignment = labeling_data.assignment
#                 if assignment.status == 'sent':
#                     assignment.status = 'in_progress'
#                     assignment.save()
#                     logger.info(f"Auto updated assignment {assignment.id} status: sent → in_progress")
            
#             logger.info(f"Data {labeling_id} successfully labeled as {label} by {request.user.username}")
            
#             return Response({
#                 'message': f'Data berhasil dilabeling sebagai {label}',
#                 'labeling_id': labeling_id,
#                 'label': label,
#                 'confirmed_by': request.user.username,
#                 'data_saved': True
#             })
            
#         except Exception as e:
#             logger.error(f"Error submitting labeling: {e}", exc_info=True)
#             return Response({
#                 'error': f'Failed to submit labeling: {str(e)}'
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EmployeeAssignmentStatusView(APIView):
    """
    View untuk melihat status assignment employee
    """
    permission_classes = [IsAuthenticated, IsEmployee]
    
    def get(self, request):
        try:
            employee_assignments = EmployeeAssignment.objects.filter(
                employee=request.user
            ).select_related('assignment').order_by('-assigned_at')
            
            assignments_data = []
            for ea in employee_assignments:
                assignment = ea.assignment
                
                # Hitung progress
                completed_count = LabelingData.objects.filter(
                    assignment=assignment,
                    confirmed_by=request.user
                ).count()
                
                assignment_info = {
                    'assignment_id': assignment.id,
                    'title': assignment.title,
                    'description': assignment.description,
                    'status': assignment.status,
                    'assigned_at': ea.assigned_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'data_range': {
                        'start_index': ea.start_index,
                        'end_index': ea.end_index,
                        'total_count': ea.data_count
                    },
                    'progress': {
                        'completed_count': completed_count,
                        'remaining_count': ea.data_count - completed_count,
                        'percentage': round((completed_count / ea.data_count * 100) if ea.data_count > 0 else 0, 2)
                    },
                    'is_started': ea.is_started,
                    'is_completed': completed_count >= ea.data_count,
                    'completed_at': ea.completed_at.strftime('%Y-%m-%d %H:%M:%S') if ea.completed_at else None
                }
                assignments_data.append(assignment_info)
            
            return Response({
                'assignments': assignments_data,
                'total_assignments': len(assignments_data),
                'employee_info': {
                    'username': request.user.username,
                    'email': request.user.email,
                    'total_completed_assignments': len([a for a in assignments_data if a['is_completed']])
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting assignment status: {e}", exc_info=True)
            return Response({
                'error': f'Failed to get assignment status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)