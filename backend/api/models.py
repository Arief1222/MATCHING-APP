from django.db import models

class MatchingData(models.Model):
    source = models.CharField(max_length=20)  # 'snapwangi' atau 'kopindag'
    data = models.JSONField()
    matched_with = models.JSONField(null=True, blank=True)  # hanya terisi kalau cocok
    confidence = models.FloatField(null=True, blank=True)
    fuzzy_score = models.FloatField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

