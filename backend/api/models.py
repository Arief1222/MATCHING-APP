# models.py
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
    
    batch_id = models.CharField(max_length=100)
    source_table = models.CharField(max_length=255)
    reference_table = models.CharField(max_length=255)
    matching_algorithm = models.CharField(max_length=20, choices=ALGORITHM_CHOICES)
    matched_data = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    confidence_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'db_final'

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
    
    class Meta:
        db_table = 'table_labeling'

