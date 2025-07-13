
from django.db import models
# Create your models here.

class Snapwangi(models.Model):
    data = models.JSONField(null=False, blank=False, default=dict)

class Duplikat(models.Model):
    data = models.JSONField(null=False, blank=False, default=dict)

class Kopindag(models.Model):
    data = models.JSONField(null=False, blank=False, default=dict)

class Koperasi(models.Model):
    data = models.JSONField(null=False, blank=False, default=dict)

class KopindagKoperasi(models.Model):
    data = models.JSONField(null=False, blank=False, default=dict)

# Create your models here.
