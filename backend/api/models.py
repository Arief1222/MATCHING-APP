from django.db import models

class SnapwangiData(models.Model):
    data = models.JSONField()  # Seluruh baris Excel disimpan dalam satu kolom JSON
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Data {self.id} diupload {self.uploaded_at}"
