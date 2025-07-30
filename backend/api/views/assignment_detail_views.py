from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from ..models import Assignment, EmployeeAssignment, LabelingData
from ..serializers import EmployeeAssignmentSerializer
import logging

logger = logging.getLogger(__name__)

class AssignmentDistributionDetailView(APIView):
    """
    View untuk melihat detail distribusi data assignment ke employee
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, assignment_id):
        try:
            assignment = Assignment.objects.get(id=assignment_id)
            employee_assignments = EmployeeAssignment.objects.filter(
                assignment=assignment
            ).select_related('employee')
            
            distribution_data = []
            total_data = assignment.dataset.row_count if assignment.dataset else 0
            
            for ea in employee_assignments:
                # Hitung progress untuk employee ini
                completed_count = LabelingData.objects.filter(
                    assignment=assignment,
                    confirmed_by=ea.employee
                ).count()
                
                distribution_info = {
                    'employee_id': ea.employee.id,
                    'employee_username': ea.employee.username,
                    'employee_name': f"{ea.employee.first_name} {ea.employee.last_name}".strip(),
                    'start_index': ea.start_index,
                    'end_index': ea.end_index,
                    'data_count': ea.data_count,
                    'completed_count': completed_count,
                    'progress_percentage': (completed_count / ea.data_count * 100) if ea.data_count > 0 else 0,
                    'assigned_at': ea.assigned_at.isoformat() if ea.assigned_at else None
                }
                distribution_data.append(distribution_info)
            
            response_data = {
                'assignment_id': assignment.id,
                'assignment_title': assignment.title,
                'dataset_name': assignment.dataset.name if assignment.dataset else 'Unknown',
                'total_data_count': total_data,
                'total_employees': len(employee_assignments),
                'distribution': distribution_data,
                'summary': {
                    'total_assigned_data': sum(ea.data_count for ea in employee_assignments),
                    'total_completed_data': sum(
                        LabelingData.objects.filter(
                            assignment=assignment,
                            confirmed_by=ea.employee
                        ).count() for ea in employee_assignments
                    ),
                    'overall_progress': 0
                }
            }
            
            # Hitung overall progress
            if response_data['summary']['total_assigned_data'] > 0:
                response_data['summary']['overall_progress'] = (
                    response_data['summary']['total_completed_data'] / 
                    response_data['summary']['total_assigned_data'] * 100
                )
            
            return Response(response_data)
            
        except Assignment.DoesNotExist:
            return Response({
                'error': f'Assignment with ID {assignment_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting assignment distribution: {e}", exc_info=True)
            return Response({
                'error': f'Failed to get assignment distribution: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# backend/api/urls.py - Tambahkan URL pattern baru
# Tambahkan di urlpatterns:
path('assignments/<int:assignment_id>/distribution/', AssignmentDistributionDetailView.as_view(), name='assignment-distribution'),

# backend/api/utils/data_distribution.py
# Utility functions untuk distribusi data

def calculate_data_distribution(total_data, num_employees):
    """
    Hitung distribusi data yang merata untuk sejumlah employee
    
    Args:
        total_data (int): Total jumlah data yang akan didistribusikan
        num_employees (int): Jumlah employee yang akan menerima data
    
    Returns:
        list: List berisi tuple (start_index, end_index, count) untuk setiap employee
    """
    if num_employees == 0 or total_data == 0:
        return []
    
    base_count = total_data // num_employees
    remainder = total_data % num_employees
    
    distributions = []
    current_index = 0
    
    for i in range(num_employees):
        # Employee pertama sampai sisa remainder mendapat 1 data tambahan
        data_count = base_count + (1 if i < remainder else 0)
        
        start_index = current_index
        end_index = current_index + data_count - 1
        
        distributions.append({
            'start_index': start_index,
            'end_index': end_index,
            'data_count': data_count
        })
        
        current_index += data_count
    
    return distributions

def redistribute_assignment_data(assignment_id, new_employee_ids):
    """
    Redistribusi data assignment ke employee baru
    
    Args:
        assignment_id (int): ID assignment yang akan didistribusi ulang
        new_employee_ids (list): List ID employee baru
    
    Returns:
        dict: Summary redistributasi
    """
    try:
        assignment = Assignment.objects.get(id=assignment_id)
        total_data = assignment.dataset.row_count if assignment.dataset else 0
        
        # Hapus assignment lama
        EmployeeAssignment.objects.filter(assignment=assignment).delete()
        
        # Buat distribusi baru
        distributions = calculate_data_distribution(total_data, len(new_employee_ids))
        
        created_assignments = []
        for i, employee_id in enumerate(new_employee_ids):
            employee = User.objects.get(id=employee_id)
            distribution = distributions[i]
            
            ea = EmployeeAssignment.objects.create(
                assignment=assignment,
                employee=employee,
                start_index=distribution['start_index'],
                end_index=distribution['end_index'],
                data_count=distribution['data_count']
            )
            created_assignments.append(ea)
        
        return {
            'success': True,
            'message': f'Successfully redistributed {total_data} data to {len(new_employee_ids)} employees',
            'total_data': total_data,
            'total_employees': len(new_employee_ids),
            'distributions': distributions
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }