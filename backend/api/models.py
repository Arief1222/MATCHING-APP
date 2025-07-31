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
    dataset = models.ForeignKey('DataTable', on_delete=models.CASCADE)  # Assuming DataTable model exists
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'), 
            ('sent', 'Sent'), 
            ('in_progress', 'In Progress'), 
            ('completed', 'Completed'), 
            ('cancelled', 'Cancelled')
        ],
        default='draft'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    def can_change_status_to_sent(self):
        """Cek apakah assignment bisa diubah ke status 'sent'"""
        return self.status == 'draft' and self.employee_assignments.exists()
    
    class Meta:
        db_table = 'api_assignment'

class LabelingData(models.Model):
    LABEL_CHOICES = [
        ('MATCH', 'Match'),
        ('UNMATCH', 'Unmatch'),
    ]
    
    data_id = models.CharField(max_length=100)
    combined_string_1 = models.TextField()
    combined_string_2 = models.TextField()
    label = models.CharField(max_length=20, choices=LABEL_CHOICES, null=True, blank=True)
    source_table = models.CharField(max_length=255)
    reference_table = models.CharField(max_length=255)
    confirmed_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, null=True, blank=True)
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='labeled_data', null=True, blank=True)

    
    class Meta:
        db_table = 'table_labeling'
        
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




class EmployeeAssignment(models.Model):
    assignment = models.ForeignKey(
        Assignment, 
        on_delete=models.CASCADE, 
        related_name='employee_assignments'
    )
    employee = models.ForeignKey(User, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    # Field untuk distribusi data
    start_index = models.IntegerField(default=0)
    end_index = models.IntegerField(default=0)
    data_count = models.IntegerField(default=0)
    
    # NEW: Field untuk tracking progress (sistem otomatis)
    completed_count = models.IntegerField(default=0, help_text="Jumlah data yang sudah dikerjakan")
    is_started = models.BooleanField(default=False, help_text="Apakah employee sudah mulai mengerjakan")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="Kapan employee selesai mengerjakan")
    
    class Meta:
        unique_together = ('assignment', 'employee')
        db_table = 'api_employeeassignment'
    
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


