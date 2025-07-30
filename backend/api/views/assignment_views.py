# backend/api/views/assignment_views.py - DENGAN SISTEM OTOMATIS

from rest_framework import generics, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone
from django.db import transaction

from api.models import Assignment, EmployeeAssignment, LabelingData, DataTable, User
from api.serializers import (
    AssignmentSerializer,
    CreateAssignmentSerializer,
    AssignmentStatusUpdateSerializer,
    EmployeeAssignmentSerializer,
    EmployeeSerializer
)
from ..permission import IsSuperadmin, IsEmployee

class AssignmentListCreateView(generics.ListCreateAPIView):
    queryset = Assignment.objects.all().order_by('-created_at')
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateAssignmentSerializer
        return AssignmentSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        print("=== Assignment Creation Debug ===")
        print("Request data:", request.data)
        print("Request user:", request.user)
        print("User groups:", [group.name for group in request.user.groups.all()])
        
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            print("Serializer validation passed")
            
            self.perform_create(serializer)
            print("Assignment created successfully")
            
            headers = self.get_success_headers(serializer.data)
            created_assignment = Assignment.objects.get(id=serializer.data['id'])
            response_serializer = AssignmentSerializer(created_assignment)
            
            return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except serializers.ValidationError as e:
            print("Validation error:", e.detail)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print("Unexpected error:", str(e))
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Internal server error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    permission_classes = [IsAdminUser]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance = self.get_object()
            serializer = self.get_serializer(instance)

        return Response(serializer.data)


# MODIFIKASI: AssignmentStatusUpdateView - Hanya untuk Draft -> Sent & Cancellation
class AssignmentStatusUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        """Admin hanya bisa mengubah status dari draft ke sent atau cancel assignment"""
        try:
            assignment = Assignment.objects.get(pk=pk)
            new_status = request.data.get('status')
            
            print(f"=== Status Update Request ===")
            print(f"Current status: {assignment.status}")
            print(f"Requested status: {new_status}")
            print(f"Has employees: {assignment.employee_assignments.exists()}")
            
            # Validasi: Admin hanya bisa mengubah draft ke sent
            if assignment.status == 'draft' and new_status == 'sent':
                if assignment.employee_assignments.exists():
                    assignment.status = 'sent'
                    assignment.save(update_fields=['status', 'updated_at'])
                    
                    serializer = AssignmentSerializer(assignment)
                    return Response({
                        'message': 'Assignment status updated to sent',
                        'assignment': serializer.data
                    })
                else:
                    return Response({
                        'error': 'Cannot send assignment without employee assignments'
                    }, status=400)
            
            # Admin bisa cancel assignment (dari status apapun kecuali completed)
            elif new_status == 'cancelled' and assignment.status != 'completed':
                assignment.status = 'cancelled'
                assignment.save(update_fields=['status', 'updated_at'])
                
                serializer = AssignmentSerializer(assignment)
                return Response({
                    'message': 'Assignment cancelled',
                    'assignment': serializer.data
                })
            
            else:
                return Response({
                    'error': f'Cannot change status from {assignment.status} to {new_status}. '
                            f'Admin can only change: draft→sent or any→cancelled. '
                            f'Other status changes happen automatically based on employee progress.'
                }, status=400)
                
        except Assignment.DoesNotExist:
            return Response({'error': 'Assignment not found'}, status=404)
        except Exception as e:
            print(f"Error in status update: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)


# BARU: Employee Views untuk Otomatis Update Status
class StartWorkingOnAssignmentView(APIView):
    permission_classes = [IsEmployee]
    
    def post(self, request, assignment_id):
        """Employee mulai mengerjakan assignment - Auto update sent → in_progress"""
        try:
            employee_assignment = EmployeeAssignment.objects.get(
                assignment_id=assignment_id,
                employee=request.user
            )
            
            assignment = employee_assignment.assignment
            
            # Cek apakah assignment dalam status yang benar
            if assignment.status not in ['sent', 'in_progress']:
                return Response({
                    'error': f'Cannot start working. Assignment status is {assignment.status}'
                }, status=400)
            
            with transaction.atomic():
                # Mark employee sebagai started
                if not employee_assignment.is_started:
                    employee_assignment.is_started = True
                    employee_assignment.save(update_fields=['is_started'])
                
                # Auto update assignment status ke in_progress jika masih sent
                if assignment.status == 'sent':
                    assignment.status = 'in_progress'
                    assignment.save(update_fields=['status', 'updated_at'])
                    print(f"Auto updated assignment {assignment.id} status: sent → in_progress")
            
            return Response({
                'message': 'Started working on assignment',
                'assignment_status': assignment.status,
                'employee_started': employee_assignment.is_started
            })
            
        except EmployeeAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found for this employee'}, status=404)
        except Exception as e:
            print(f"Error starting work: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)


class UpdateWorkProgressView(APIView):
    permission_classes = [IsEmployee]
    
    def post(self, request, assignment_id):
        """Employee update progress - Auto check completion dan update in_progress → completed"""
        try:
            employee_assignment = EmployeeAssignment.objects.get(
                assignment_id=assignment_id,
                employee=request.user
            )
            
            assignment = employee_assignment.assignment
            completed_count = request.data.get('completed_count', 0)
            
            with transaction.atomic():
                # Update progress
                employee_assignment.completed_count = completed_count
                
                # Auto mark sebagai completed jika sudah selesai semua
                if completed_count >= employee_assignment.data_count:
                    if not employee_assignment.completed_at:
                        employee_assignment.completed_at = timezone.now()
                        print(f"Employee {request.user.username} completed their part")
                
                employee_assignment.save(update_fields=['completed_count', 'completed_at'])
                
                # Cek apakah semua employee sudah selesai
                all_employee_assignments = assignment.employee_assignments.all()
                all_completed = all(
                    ea.completed_count >= ea.data_count or ea.completed_at is not None
                    for ea in all_employee_assignments
                )
                
                # Auto update assignment status ke completed jika semua employee selesai
                if all_completed and assignment.status == 'in_progress':
                    assignment.status = 'completed'
                    assignment.save(update_fields=['status', 'updated_at'])
                    print(f"Auto updated assignment {assignment.id} status: in_progress → completed")
            
            return Response({
                'message': 'Progress updated',
                'completed_count': employee_assignment.completed_count,
                'total_count': employee_assignment.data_count,
                'is_completed': employee_assignment.completed_count >= employee_assignment.data_count,
                'assignment_status': assignment.status,
                'assignment_completed': assignment.status == 'completed'
            })
            
        except EmployeeAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found for this employee'}, status=404)
        except Exception as e:
            print(f"Error updating progress: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)


class MyAssignmentsView(APIView):
    permission_classes = [IsEmployee]
    
    def get(self, request):
        """Get assignments untuk employee yang sedang login"""
        try:
            employee_assignments = EmployeeAssignment.objects.filter(
                employee=request.user
            ).select_related('assignment').order_by('-assigned_at')
            
            assignments_data = []
            for ea in employee_assignments:
                assignment = ea.assignment
                assignments_data.append({
                    'assignment_id': assignment.id,
                    'title': assignment.title,
                    'description': assignment.description,
                    'status': assignment.status,
                    'status_display': assignment.get_status_display(),
                    'assigned_at': ea.assigned_at,
                    'start_index': ea.start_index,
                    'end_index': ea.end_index,
                    'data_count': ea.data_count,
                    'completed_count': ea.completed_count,
                    'is_started': ea.is_started,
                    'is_completed': ea.completed_count >= ea.data_count,
                    'completed_at': ea.completed_at,
                    'progress_percentage': round((ea.completed_count / ea.data_count * 100) if ea.data_count > 0 else 0, 2)
                })
            
            return Response({
                'assignments': assignments_data,
                'total_count': len(assignments_data)
            })
            
        except Exception as e:
            print(f"Error getting my assignments: {str(e)}")
            return Response({'error': str(e)}, status=500)


# MODIFIKASI: Tambah progress info ke existing views
class AssignmentProgressView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request, pk):
        """Get detailed progress assignment untuk admin"""
        try:
            assignment = Assignment.objects.get(pk=pk)
            employee_assignments = assignment.employee_assignments.all()
            
            # Hitung overall progress
            total_data = sum(ea.data_count for ea in employee_assignments)
            completed_data = sum(ea.completed_count for ea in employee_assignments)
            progress_percentage = (completed_data / total_data * 100) if total_data > 0 else 0
            
            return Response({
                'assignment_id': assignment.id,
                'title': assignment.title,
                'status': assignment.status,
                'status_display': assignment.get_status_display(),
                'overall_progress': {
                    'total_data': total_data,
                    'completed_data': completed_data,
                    'percentage': round(progress_percentage, 2)
                },
                'employees': [
                    {
                        'employee_id': ea.employee.id,
                        'employee_name': ea.employee.username,
                        'data_count': ea.data_count,
                        'completed_count': ea.completed_count,
                        'progress_percentage': round((ea.completed_count / ea.data_count * 100) if ea.data_count > 0 else 0, 2),
                        'is_started': ea.is_started,
                        'is_completed': ea.completed_count >= ea.data_count,
                        'assigned_at': ea.assigned_at,
                        'completed_at': ea.completed_at
                    }
                    for ea in employee_assignments
                ],
                'created_at': assignment.created_at,
                'updated_at': assignment.updated_at
            })
            
        except Assignment.DoesNotExist:
            return Response({'error': 'Assignment not found'}, status=404)
        except Exception as e:
            print(f"Error getting assignment progress: {str(e)}")
            return Response({'error': str(e)}, status=500)


# Existing views tetap sama
class EmployeeAssignmentListView(generics.ListAPIView):
    serializer_class = EmployeeAssignmentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        assignment_id = self.kwargs.get('assignment_id')
        if assignment_id:
            try:
                assignment = Assignment.objects.get(id=assignment_id)
                return EmployeeAssignment.objects.filter(assignment=assignment)
            except Assignment.DoesNotExist:
                return EmployeeAssignment.objects.none()
        return EmployeeAssignment.objects.all()


class EmployeeListView(generics.ListAPIView):
    queryset = User.objects.filter(groups__name='employee')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminUser]