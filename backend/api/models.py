# backend/api/models.py - PERBAIKAN MODEL

from django.db import models
from django.contrib.auth.models import User
import json


class DataTable(models.Model):
    name = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True) 
    row_count = models.IntegerField(default=0)
    column_names = models.JSONField(default=list)
    def __str__(self):
        return f"table_{self.name}"

class MatchingResult(models.Model):
    STATUS_CHOICES = [
        ('MATCH', 'Match'),
        ('UNMATCH', 'Unmatch'),
        ('ENRICHED', 'Enriched'),
    ]
    
    ALGORITHM_CHOICES = [
        ('FAISS', 'FAISS'),
        ('FUZZY', 'FuzzyWuzzy'),
        ('TFIDF', 'TF-IDF Cosine'),
        ('XGBOOST', 'XGBoost'),
        ('COMBINED', 'Combined Algorithm'),
    ]
    
    # PERBAIKAN: Tambah indexes pada field yang sering di-query
    batch_id = models.CharField(max_length=100, db_index=True)
    source_table = models.CharField(max_length=255, db_index=True)
    reference_table = models.CharField(max_length=255, db_index=True)
    matching_algorithm = models.CharField(max_length=20, choices=ALGORITHM_CHOICES, db_index=True)
    matched_data = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, db_index=True)
    confidence_score = models.FloatField(db_index=True)  # Untuk filtering by confidence
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'db_final'
        # OPTIMASI: Default ordering untuk pagination yang efisien
        ordering = ['-id']  # Menggunakan primary key lebih cepat dari created_at
        
        # OPTIMASI: Composite indexes untuk query yang sering digunakan
        indexes = [
            # Single field indexes (sudah ada dari db_index=True)
            
            # Composite indexes untuk kombinasi filter yang sering digunakan
            models.Index(fields=['status', 'batch_id'], name='idx_status_batch'),
            models.Index(fields=['status', 'source_table'], name='idx_status_source'),
            models.Index(fields=['status', 'reference_table'], name='idx_status_ref'),
            models.Index(fields=['status', 'matching_algorithm'], name='idx_status_algo'),
            models.Index(fields=['status', 'confidence_score'], name='idx_status_confidence'),
            models.Index(fields=['status', '-id'], name='idx_status_id_desc'),
            
            # Untuk analytics dan reporting
            models.Index(fields=['batch_id', 'status'], name='idx_batch_status'),
            models.Index(fields=['source_table', 'reference_table', 'status'], name='idx_tables_status'),
            models.Index(fields=['matching_algorithm', 'status'], name='idx_algo_status'),
            
            # Untuk date range queries
            models.Index(fields=['created_at', 'status'], name='idx_date_status'),
            models.Index(fields=['-created_at'], name='idx_created_desc'),
        ]
    
    def __str__(self):
        return f"Match Result {self.id} - {self.status}"
class Assignment(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    dataset = models.ForeignKey('DataTable', on_delete=models.CASCADE)
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'), 
            ('sent', 'Sent'), 
            ('in_progress', 'In Progress'), 
            ('completed', 'Completed'), 
            ('cancelled', 'Cancelled')
        ],
        default='draft',
        db_index=True  # Add index for status filtering
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # NEW: Track total data assigned
    total_data_count = models.IntegerField(default=0, help_text="Total data yang di-assign untuk task ini")
    
    def __str__(self):
        return self.title
    
    def can_change_status_to_sent(self):
        """Cek apakah assignment bisa diubah ke status 'sent'"""
        return self.status == 'draft' and self.employee_assignments.exists()
    
    def get_progress_summary(self):
        """Get overall progress summary for this assignment"""
        total_assigned = self.total_data_count
        total_completed = self.labeling_data.filter(confirmed_by__isnull=False).count()
        
        return {
            'total_assigned': total_assigned,
            'total_completed': total_completed,
            'remaining': total_assigned - total_completed,
            'progress_percentage': round((total_completed / total_assigned * 100) if total_assigned > 0 else 0, 2)
        }
    
    def auto_complete_if_finished(self):
        """Auto complete assignment if all data is labeled"""
        progress = self.get_progress_summary()
        if progress['remaining'] == 0 and self.status == 'in_progress':
            self.status = 'completed'
            self.save()
            return True
        return False
    
    class Meta:
        db_table = 'api_assignment'
        indexes = [
            models.Index(fields=['status', 'created_at'], name='idx_assignment_status_date'),
            models.Index(fields=['dataset', 'status'], name='idx_assignment_dataset_status'),
        ]

    
class LabelingData(models.Model):
    LABEL_CHOICES = [
        ('MATCH', 'Match'),
        ('UNMATCH', 'Unmatch'),
    ]
    
    data_id = models.CharField(max_length=100, db_index=True)  # Add index for lookups
    combined_string_1 = models.TextField()
    combined_string_2 = models.TextField()
    label = models.CharField(max_length=20, choices=LABEL_CHOICES, null=True, blank=True)
    source_table = models.CharField(max_length=255, db_index=True)
    reference_table = models.CharField(max_length=255, db_index=True)
    confirmed_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='confirmed_labelings'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # PERBAIKAN UTAMA: Assignment harus required untuk data baru
    assignment = models.ForeignKey(
        Assignment, 
        on_delete=models.CASCADE, 
        null=True,  # Sementara untuk data existing
        blank=True,  # Sementara untuk data existing
        related_name='labeling_data'
    )
    
    # HAPUS field employee - redundant karena sudah ada di EmployeeAssignment
    # employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='labeled_data', null=True, blank=True)
    
    class Meta:
        db_table = 'table_labeling'
        # Add indexes for better query performance
        indexes = [
            # Single field indexes (already defined with db_index=True)
            
            # Composite indexes for common queries
            models.Index(fields=['assignment', 'confirmed_by'], name='idx_assignment_confirmed'),
            models.Index(fields=['assignment', 'label'], name='idx_assignment_label'),
            models.Index(fields=['assignment', 'created_at'], name='idx_assignment_created'),
            
            # For the main query in your view
            models.Index(
                fields=['assignment', 'confirmed_by'], 
                name='idx_labeling_main_query',
                condition=models.Q(confirmed_by__isnull=True)  # Partial index for unlabeled data
            ),
            
            # For analytics
            models.Index(fields=['source_table', 'reference_table'], name='idx_tables'),
            models.Index(fields=['label', 'created_at'], name='idx_label_date'),
        ]
        
        # Add constraints (will be applied after data migration)
        constraints = [
            # Ensure data integrity after migration is complete
            # models.CheckConstraint(
            #     check=models.Q(assignment__isnull=False), 
            #     name='labeling_data_must_have_assignment'
            # ),
        ]
    
    def __str__(self):
        return f"LabelingData {self.id} - {self.label or 'Unlabeled'}"
    
    @property
    def is_labeled(self):
        """Check if this data has been labeled"""
        return self.label is not None and self.confirmed_by is not None
    
    @property
    def assigned_employee(self):
        """Get the employee assigned to label this data"""
        if self.assignment:
            return self.assignment.employee_assignments.first()
        return None



class EmployeeAssignment(models.Model):
    assignment = models.ForeignKey(
        Assignment, 
        on_delete=models.CASCADE, 
        related_name='employee_assignments'
    )
    employee = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='employee_assignments'  # Add related_name
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    # Field untuk distribusi data
    start_index = models.IntegerField(default=0)
    end_index = models.IntegerField(default=0)
    data_count = models.IntegerField(default=0)
    
    # Field untuk tracking progress (sistem otomatis)
    completed_count = models.IntegerField(default=0, help_text="Jumlah data yang sudah dikerjakan")
    is_started = models.BooleanField(default=False, help_text="Apakah employee sudah mulai mengerjakan")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="Kapan employee selesai mengerjakan")
    
    class Meta:
        unique_together = ('assignment', 'employee')
        db_table = 'api_employeeassignment'
        indexes = [
            models.Index(fields=['employee', 'assignment'], name='idx_emp_assignment'),
            models.Index(fields=['assignment', 'is_started'], name='idx_assignment_started'),
            models.Index(fields=['employee', 'completed_at'], name='idx_employee_completed'),
        ]
    
    def __str__(self):
        return f"{self.assignment.title} - {self.employee.username}"
    
    def is_completed(self):
        """Cek apakah employee sudah selesai mengerjakan tugasnya"""
        return self.completed_count >= self.data_count or self.completed_at is not None
    
    def progress_percentage(self):
        """Hitung persentase progress"""
        if self.data_count <= 0:
            return 0
        return round((self.completed_count / self.data_count) * 100, 2)
    
    def update_progress(self):
        """Update progress based on actual labeled data"""
        completed = LabelingData.objects.filter(
            assignment=self.assignment,
            confirmed_by=self.employee
        ).count()
        
        self.completed_count = completed
        
        # Mark as started if not yet started and has progress
        if not self.is_started and completed > 0:
            self.is_started = True
        
        # Mark as completed if all data is done
        if completed >= self.data_count and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()
        
        self.save()
        return completed
    
    def get_unlabeled_data(self):
        """Get unlabeled data for this employee assignment"""
        return LabelingData.objects.filter(
            assignment=self.assignment,
            confirmed_by__isnull=True
        ).order_by('id')[self.start_index:self.start_index + self.data_count]


class MatchingJob(models.Model):
    job_id = models.CharField(max_length=100, unique=True)
    table_name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=[
            ('Pending', 'Pending'),
            ('Success', 'Success'),
            ('Failed', 'Failed')
        ],
        default='Pending'
    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.job_id} - {self.status}"

