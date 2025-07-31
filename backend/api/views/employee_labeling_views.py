# backend/api/views/employee_labeling_views.py
from rest_framework.views import APIView
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
            logger.info(f"=== Employee {request.user.username} requesting labeling data ===")
            
            # Ambil assignment yang ditugaskan kepada employee ini
            employee_assignments = EmployeeAssignment.objects.filter(
                employee=request.user,
                assignment__status__in=['sent', 'in_progress']  # Hanya assignment yang aktif
            ).select_related('assignment')
            
            if not employee_assignments.exists():
                return Response({
                    'message': 'Tidak ada assignment yang ditugaskan kepada Anda',
                    'unlabeled_data': [],
                    'total_assigned': 0,
                    'total_completed': 0,
                    'assignments': []
                })
            
            all_labeling_data = []
            assignment_summary = []
            
            for emp_assignment in employee_assignments:
                assignment = emp_assignment.assignment
                
                # Query untuk mendapatkan data labeling dalam range yang ditugaskan
                with connection.cursor() as cursor:
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
                        emp_assignment.assignment.id,  # assignment_id
                        request.user.id,              # confirmed_by_id
                        emp_assignment.start_index,   # OFFSET
                        emp_assignment.data_count     # LIMIT
                    ])
                    rows = cursor.fetchall()

                    
                    # Convert ke format yang mudah digunakan frontend
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
                
                # Hitung progress untuk assignment ini
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
                    'remaining_data': emp_assignment.data_count - completed_count,
                    'progress_percentage': round((completed_count / emp_assignment.data_count * 100) if emp_assignment.data_count > 0 else 0, 2),
                    'start_index': emp_assignment.start_index,
                    'end_index': emp_assignment.end_index,
                    'status': assignment.status
                }
                assignment_summary.append(assignment_info)
            
            # Hitung total statistik
            total_assigned = sum(info['total_data'] for info in assignment_summary)
            total_completed = sum(info['completed_data'] for info in assignment_summary)
            overall_progress = round((total_completed / total_assigned * 100) if total_assigned > 0 else 0, 2)
            
            logger.info(f"Employee {request.user.username} has {len(all_labeling_data)} unlabeled data items")
            
            return Response({
                'message': f'Data berhasil dimuat untuk {len(employee_assignments)} assignment',
                'unlabeled_data': all_labeling_data,
                'assignments': assignment_summary,
                'summary': {
                    'total_assigned': total_assigned,
                    'total_completed': total_completed,
                    'remaining': total_assigned - total_completed,
                    'overall_progress': overall_progress
                },
                'employee_info': {
                    'username': request.user.username,
                    'email': request.user.email,
                    'total_assignments': len(employee_assignments)
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting labeling data for employee {request.user.username}: {e}", exc_info=True)
            return Response({
                'error': f'Failed to get labeling data: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EmployeeSubmitLabelingView(APIView):
    """
    View untuk employee submit hasil labeling
    """
    permission_classes = [IsAuthenticated, IsEmployee]
    
    def post(self, request):
        try:
            labeling_id = request.data.get('labeling_id')
            label = request.data.get('label')  # 'MATCH' atau 'UNMATCH'
            
            logger.info(f"Employee {request.user.username} submitting label for ID {labeling_id}: {label}")
            
            # Validasi input
            if not labeling_id or not label:
                return Response({
                    'error': 'labeling_id dan label harus diisi'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if label not in ['MATCH', 'UNMATCH']:
                return Response({
                    'error': 'Label harus MATCH atau UNMATCH'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Ambil data labeling
            try:
                labeling_data = LabelingData.objects.get(id=labeling_id)
            except LabelingData.DoesNotExist:
                return Response({
                    'error': f'Data labeling dengan ID {labeling_id} tidak ditemukan'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Cek apakah employee ini berhak melabeling data ini
            if labeling_data.assignment:
                employee_assignment = EmployeeAssignment.objects.filter(
                    assignment=labeling_data.assignment,
                    employee=request.user
                ).first()
                
                if not employee_assignment:
                    return Response({
                        'error': 'Anda tidak memiliki akses untuk melabeling data ini'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Cek apakah data sudah dilabeling
            if labeling_data.confirmed_by:
                return Response({
                    'error': f'Data ini sudah dilabeling oleh {labeling_data.confirmed_by.username}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update data labeling
            labeling_data.label = label
            labeling_data.confirmed_by = request.user
            labeling_data.save()
            
            # Update progress pada employee assignment jika ada
            if labeling_data.assignment:
                employee_assignment = EmployeeAssignment.objects.get(
                    assignment=labeling_data.assignment,
                    employee=request.user
                )
                
                # Hitung ulang completed count
                completed_count = LabelingData.objects.filter(
                    assignment=labeling_data.assignment,
                    confirmed_by=request.user
                ).count()
                
                employee_assignment.completed_count = completed_count
                
                # Mark sebagai started jika belum
                if not employee_assignment.is_started:
                    employee_assignment.is_started = True
                
                employee_assignment.save()
                
                # Auto update assignment status ke in_progress jika masih sent
                assignment = labeling_data.assignment
                if assignment.status == 'sent':
                    assignment.status = 'in_progress'
                    assignment.save()
                    logger.info(f"Auto updated assignment {assignment.id} status: sent → in_progress")
            
            logger.info(f"Data {labeling_id} successfully labeled as {label} by {request.user.username}")
            
            return Response({
                'message': f'Data berhasil dilabeling sebagai {label}',
                'labeling_id': labeling_id,
                'label': label,
                'confirmed_by': request.user.username,
                'data_saved': True
            })
            
        except Exception as e:
            logger.error(f"Error submitting labeling: {e}", exc_info=True)
            return Response({
                'error': f'Failed to submit labeling: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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