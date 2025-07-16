from django.urls import path
from . import views
from .views import upload_snapwangi

urlpatterns = [
    path('upload/', upload_snapwangi),
    path('process_columns/', views.process_columns,name='process_columns'),
    path('match_faiss/', views.match_faiss, name='match_faiss'),
    path('download_results/', views.download_results),
    path('recommend_columns/', views.recommend_columns),  
    path('progress_faiss/', views.progress_faiss), 
    path('validate/', views.validate_item),  
    path('retrain/', views.retrain_model),
    path('export_cleaned_results/', views.export_cleaned_results),
    path('undo_validation/', views.undo_validation),
    path('upload_database/', views.upload_database),  
    
]
