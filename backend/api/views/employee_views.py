from django.contrib.auth.models import User, Group
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from ..permission import IsSuperadmin, IsKepalaBPS, IsEmployee
import logging

logger = logging.getLogger(__name__)


class EmployeeListView(APIView):
    """
    View untuk mengambil daftar user dengan role employee
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            logger.info("=== EmployeeListView Start ===")
            
            # Ambil semua user yang memiliki group 'employee'
            try:
                employee_group = Group.objects.get(name='employee')
                employees = User.objects.filter(groups=employee_group).order_by('username')
            except Group.DoesNotExist:
                # Jika group employee tidak ada, coba ambil user berdasarkan field lain
                # atau return empty list
                logger.warning("Employee group does not exist")
                employees = User.objects.none()
            
            employees_list = []
            for employee in employees:
                employee_info = {
                    'id': employee.id,
                    'username': employee.username,
                    'email': employee.email,
                    'first_name': employee.first_name,
                    'last_name': employee.last_name,
                    'is_active': employee.is_active,
                    'date_joined': employee.date_joined.isoformat() if employee.date_joined else None,
                    'groups': [group.name for group in employee.groups.all()],
                }
                employees_list.append(employee_info)
            
            logger.info(f"Found {len(employees_list)} employees")
            return Response(employees_list)
        
        except Exception as e:
            logger.error(f"Error in EmployeeListView: {e}", exc_info=True)
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EmployeeDetailView(APIView):
    """
    View untuk detail employee specific
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, employee_id):
        try:
            logger.info(f"=== Getting employee details: {employee_id} ===")
            
            try:
                employee = User.objects.get(id=employee_id)
            except User.DoesNotExist:
                return Response({
                    'error': f'Employee with ID {employee_id} not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Cek apakah user adalah employee
            if not employee.groups.filter(name='employee').exists():
                return Response({
                    'error': 'User is not an employee'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            employee_detail = {
                'id': employee.id,
                'username': employee.username,
                'email': employee.email,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'is_active': employee.is_active,
                'date_joined': employee.date_joined.isoformat() if employee.date_joined else None,
                'last_login': employee.last_login.isoformat() if employee.last_login else None,
                'groups': [group.name for group in employee.groups.all()],
                # Tambahkan statistik assignment jika diperlukan
                'assignment_stats': self._get_employee_assignment_stats(employee_id),
            }
            
            return Response(employee_detail)
        
        except Exception as e:
            logger.error(f"Error getting employee details {employee_id}: {e}", exc_info=True)
            return Response({
                'error': f'Failed to get employee details: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_employee_assignment_stats(self, employee_id):
        """
        Helper method untuk mendapatkan statistik assignment employee
        """
        try:
            # Import di sini untuk menghindari circular import
            from ..models import Assignment, EmployeeAssignment
            
            total_assignments = EmployeeAssignment.objects.filter(employee_id=employee_id).count()
            completed_assignments = EmployeeAssignment.objects.filter(
                employee_id=employee_id,
                status='completed'
            ).count()
            in_progress_assignments = EmployeeAssignment.objects.filter(
                employee_id=employee_id,
                status='in_progress'
            ).count()
            
            return {
                'total_assignments': total_assignments,
                'completed_assignments': completed_assignments,
                'in_progress_assignments': in_progress_assignments,
                'completion_rate': (completed_assignments / total_assignments * 100) if total_assignments > 0 else 0
            }
        except Exception as e:
            logger.warning(f"Could not get assignment stats for employee {employee_id}: {e}")
            return {
                'total_assignments': 0,
                'completed_assignments': 0,
                'in_progress_assignments': 0,
                'completion_rate': 0
            }