from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_file, name='upload_file'),
    path('process_columns/', views.process_columns, name='process_columns'),
    path('match_faiss/', views.match_faiss, name='match_faiss'),
    path('download_results/', views.download_results),
    path('recommend_columns/', views.recommend_columns),  # 👈 Tambahkan ini
    path('progress_faiss/', views.progress_faiss),  
    path('upload_database/', views.upload_database),  
]
