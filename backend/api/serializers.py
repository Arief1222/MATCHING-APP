from rest_framework import serializers
from .models import DataTable
from django.contrib.auth.models import User
from .models import DataTable, Assignment, EmployeeAssignment, LabelingData


class DataTableSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataTable
        fields = ['id', 'name']
serializers

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


# Serializer untuk EmployeeAssignment (menghubungkan Assignment dan Employee)
class EmployeeAssignmentSerializer(serializers.ModelSerializer):
    employee = EmployeeSerializer(read_only=True)
    completed_count = serializers.SerializerMethodField()
    total_count = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeAssignment
        fields = ['id', 'employee', 'completed_count', 'total_count', 'assigned_at']

    def get_completed_count(self, obj):
        return LabelingData.objects.filter(assignment=obj.assignment, confirmed_by=obj.employee, status='completed').count()

    def get_total_count(self, obj):
        return LabelingData.objects.filter(assignment=obj.assignment).count()


# Serializer utama untuk model Assignment
class AssignmentSerializer(serializers.ModelSerializer):
    employee_assignments = EmployeeAssignmentSerializer(many=True, read_only=True)
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)


    class Meta:
        model = Assignment
        fields = [
            'id',
            'title',
            'description',
            'dataset', 
            'dataset_name',
            'status',
            'created_at',
            'updated_at',
            'employee_assignments' 
        ]
        read_only_fields = ['created_at', 'updated_at', 'employee_assignments', 'dataset_name']


class CreateAssignmentSerializer(serializers.ModelSerializer):
    employees = serializers.ListField(child=serializers.IntegerField(), write_only=True)
    dataset = serializers.CharField()  # Ubah ke CharField untuk fleksibilitas

    class Meta:
        model = Assignment
        fields = [
            'id',
            'title',
            'description',
            'dataset',
            'employees'
        ]
        read_only_fields = ['id']

    def validate_dataset(self, value):
        """Validasi dataset - cari berdasarkan ID atau name"""
        try:
            # Coba cari berdasarkan ID terlebih dahulu
            if str(value).isdigit():
                dataset = DataTable.objects.get(id=int(value))
            else:
                # Jika bukan digit, cari berdasarkan name
                dataset = DataTable.objects.get(name=value)
            return dataset
        except DataTable.DoesNotExist:
            raise serializers.ValidationError(f"Dataset with identifier '{value}' not found")
        except Exception as e:
            raise serializers.ValidationError(f"Invalid dataset identifier: {str(e)}")

    def validate_employees(self, value):
        """Validasi employee IDs"""
        if not value:
            raise serializers.ValidationError("At least one employee must be selected")
        
        # Validasi bahwa semua employee ID valid
        valid_employees = []
        for emp_id in value:
            try:
                employee = User.objects.get(id=emp_id)
                # Pastikan user adalah employee (memiliki group employee)
                if not employee.groups.filter(name='employee').exists():
                    raise serializers.ValidationError(f"User {employee.username} is not an employee")
                valid_employees.append(emp_id)
            except User.DoesNotExist:
                raise serializers.ValidationError(f"Employee with ID {emp_id} not found")
        
        return valid_employees

    def validate_title(self, value):
        """Validasi title tidak kosong"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty")
        return value.strip()

    def create(self, validated_data):
        # Ambil dataset yang sudah divalidasi
        dataset = validated_data.pop('dataset')
        employees_data = validated_data.pop('employees', [])
        
        # Buat assignment dengan dataset object
        assignment = Assignment.objects.create(dataset=dataset, **validated_data)

        # Buat objek EmployeeAssignment untuk setiap employee ID
        for employee_id in employees_data:
            try:
                employee = User.objects.get(id=employee_id)
                EmployeeAssignment.objects.create(assignment=assignment, employee=employee)
            except User.DoesNotExist:
                print(f"Warning: Employee with ID {employee_id} not found during creation.")
            except Exception as e:
                print(f"Error assigning employee {employee_id}: {e}")

        return assignment

# Serializer untuk UPDATE status Assignment
class AssignmentStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['status']