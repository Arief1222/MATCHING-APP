# backend/api/serializers.py - PERBAIKAN CreateAssignmentSerializer

from rest_framework import serializers
from .models import DataTable, Assignment, EmployeeAssignment, LabelingData
from django.contrib.auth.models import User

class DataTableSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataTable
        fields = ['id', 'name']

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

class EmployeeAssignmentSerializer(serializers.ModelSerializer):
    employee = EmployeeSerializer(read_only=True)
    completed_count = serializers.SerializerMethodField()
    total_count = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeAssignment
        fields = [
            'id', 'employee', 'completed_count', 'total_count', 
            'assigned_at', 'start_index', 'end_index', 'data_count'
        ]

    def get_completed_count(self, obj):
        return LabelingData.objects.filter(
            assignment=obj.assignment, 
            confirmed_by=obj.employee
        ).count()

    def get_total_count(self, obj):
        return obj.data_count

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
    dataset = serializers.CharField()

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
        """Validasi dataset - cari berdasarkan name"""
        print(f"Validating dataset: {value} (type: {type(value)})")
        
        try:
            # Coba cari berdasarkan name terlebih dahulu
            if isinstance(value, str):
                dataset = DataTable.objects.get(name=value)
                print(f"Found dataset by name: {dataset.name} (ID: {dataset.id})")
            else:
                # Jika integer, cari berdasarkan ID
                dataset = DataTable.objects.get(id=int(value))
                print(f"Found dataset by ID: {dataset.name} (ID: {dataset.id})")
            
            return dataset
            
        except DataTable.DoesNotExist:
            print(f"Dataset not found: {value}")
            available_datasets = DataTable.objects.values_list('name', flat=True)
            print(f"Available datasets: {list(available_datasets)}")
            raise serializers.ValidationError(f"Dataset '{value}' tidak ditemukan. Dataset yang tersedia: {list(available_datasets)}")
        except Exception as e:
            print(f"Error validating dataset: {e}")
            raise serializers.ValidationError(f"Error validasi dataset: {str(e)}")

    def validate_employees(self, value):
        """Validasi employee IDs"""
        print(f"Validating employees: {value}")
        
        if not value:
            raise serializers.ValidationError("Minimal satu employee harus dipilih")
        
        if not isinstance(value, list):
            raise serializers.ValidationError("Employee harus berupa list")
        
        valid_employees = []
        for emp_id in value:
            try:
                emp_id = int(emp_id)  # Pastikan integer
                employee = User.objects.get(id=emp_id)
                
                # Cek apakah user adalah employee
                if not employee.groups.filter(name='employee').exists():
                    raise serializers.ValidationError(f"User {employee.username} bukan employee")
                
                valid_employees.append(emp_id)
                print(f"Valid employee: {employee.username} (ID: {emp_id})")
                
            except User.DoesNotExist:
                raise serializers.ValidationError(f"Employee dengan ID {emp_id} tidak ditemukan")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"ID employee tidak valid: {emp_id}")
        
        print(f"All employees validated: {valid_employees}")
        return valid_employees

    def validate_title(self, value):
        """Validasi title tidak kosong"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title tidak boleh kosong")
        return value.strip()

    def create(self, validated_data):
        print("=== Creating Assignment ===")
        print(f"Validated data: {validated_data}")
        
        dataset = validated_data.pop('dataset')
        employees_data = validated_data.pop('employees', [])
        
        print(f"Dataset object: {dataset} (type: {type(dataset)})")
        print(f"Employees: {employees_data}")
        
        # Buat assignment dengan dataset object
        assignment = Assignment.objects.create(dataset=dataset, **validated_data)
        print(f"Created assignment: {assignment.id}")

        # Hitung distribusi data untuk setiap employee
        total_data = dataset.row_count or 0
        num_employees = len(employees_data)
        
        print(f"Total data: {total_data}, Num employees: {num_employees}")
        
        if num_employees > 0 and total_data > 0:
            # Hitung pembagian data
            base_count = total_data // num_employees
            remainder = total_data % num_employees
            
            print(f"Base count per employee: {base_count}, Remainder: {remainder}")
            
            current_index = 0
            
            for i, employee_id in enumerate(employees_data):
                try:
                    employee = User.objects.get(id=employee_id)
                    
                    # Hitung jumlah data untuk employee ini
                    data_count = base_count
                    if i < remainder:  # Employee pertama mendapat sisa data
                        data_count += 1
                    
                    # Hitung range index
                    start_index = current_index
                    end_index = current_index + data_count - 1 if data_count > 0 else current_index
                    
                    print(f"Employee {employee.username}: {data_count} data (index {start_index}-{end_index})")
                    
                    # Buat EmployeeAssignment dengan distribusi data
                    EmployeeAssignment.objects.create(
                        assignment=assignment,
                        employee=employee,
                        start_index=start_index,
                        end_index=end_index,
                        data_count=data_count
                    )
                    
                    current_index += data_count
                    
                except User.DoesNotExist:
                    print(f"Warning: Employee with ID {employee_id} not found during creation.")
                except Exception as e:
                    print(f"Error assigning employee {employee_id}: {e}")
                    raise serializers.ValidationError(f"Error saat assign employee: {str(e)}")

        print(f"Assignment created successfully with {num_employees} employees")
        return assignment

class AssignmentStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['status']