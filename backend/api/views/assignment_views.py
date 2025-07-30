# backend/api/views/assignment_views.py - PERBAIKAN LENGKAP

from rest_framework import generics, status, serializers  # Tambahkan import serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

from api.models import Assignment, EmployeeAssignment, LabelingData, DataTable, User
from api.serializers import (
    AssignmentSerializer,
    CreateAssignmentSerializer,
    AssignmentStatusUpdateSerializer,
    EmployeeAssignmentSerializer,
    EmployeeSerializer
)

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
            
        except serializers.ValidationError as e:  # Sekarang serializers sudah diimport
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


class AssignmentStatusUpdateView(generics.UpdateAPIView):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentStatusUpdateSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'pk'

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

class EmployeeAssignmentListView(generics.ListAPIView):
    serializer_class = EmployeeAssignmentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        assignment_id = self.kwargs['assignment_id']
        try:
            assignment = Assignment.objects.get(id=assignment_id)
            return EmployeeAssignment.objects.filter(assignment=assignment)
        except Assignment.DoesNotExist:
            return EmployeeAssignment.objects.none()

class EmployeeListView(generics.ListAPIView):
    queryset = User.objects.filter(groups__name='employee')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminUser]