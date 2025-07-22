from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from .views import (
    BulkTableOperationsView,
    ExportCategorizedResultsView,
    GetCategorizedMatchResultsView,
    GetMatchingSummaryView,
    JobStatusView,
    MatchingJobListView,
    PrepareCombinedDataView,
    TableManagementView,
    upload_file,
    GetAvailableTablesView,
    GetRecommendedColumnsView,
    StartMatchingView,
    GetMatchingResultsView,
    GetLabelingDataView,
    SubmitLabelingView,
    RetrainModelView,
    GetMatchingStatsView,
    GetAvailableTablesView,
    handle_table_operations
)

urlpatterns = [
    path('upload/', upload_file, name='upload_file'),
   # path('upload/', UploadDataView.as_view(), name='upload_data'),
    path('prepare-combined/', PrepareCombinedDataView.as_view(), name='prepare_combined'),
    path('tables/', GetAvailableTablesView.as_view(), name='get_tables'),
    path('recommend-columns/', GetRecommendedColumnsView.as_view(), name='recommend_columns'),
    path('start-matching/', StartMatchingView.as_view(), name='start_matching'),
    path('matching-results/', GetMatchingResultsView.as_view(), name='get_matching_results'),
    path('labeling-data/', GetLabelingDataView.as_view(), name='get_labeling_data'),
    path('submit-labeling/', SubmitLabelingView.as_view(), name='submit_labeling'),
    path('retrain-model/', RetrainModelView.as_view(), name='retrain_model'),
    path('matching-stats/', GetMatchingStatsView.as_view(), name='matching_stats'),
    path('matching-jobs/', MatchingJobListView.as_view(), name='matching_jobs'),
    path('api-token-auth/', obtain_auth_token),
    path('job-status/<str:job_id>/', JobStatusView.as_view(), name='job_status'),
    path('api/tables/', GetAvailableTablesView.as_view(), name='get_available_tables'),
    path('tables/<str:table_name>/', TableManagementView.as_view(), name='table_management'),
    path('tables/bulk/delete/', BulkTableOperationsView.as_view(), name='bulk_table_operations'),
    path('table-operations/', handle_table_operations, name='handle_table_operations'),
    path('categorized-results/', GetCategorizedMatchResultsView.as_view(), name='categorized_match_results'),
    path('matching-summary/', GetMatchingSummaryView.as_view(), name='matching_summary'),
    path('export-categorized/', ExportCategorizedResultsView.as_view(), name='export_categorized')
]
    

# from django.urls import path
# from . import views
# from .views import export_table, handle_table_operations, upload_file
# # from .views import get_uploaded_columns

# urlpatterns = [
#     #path('columns/', get_uploaded_columns),
#     path('upload/', upload_file, name='upload_file'),
#     path('data/', handle_table_operations, name='handle_table_operations'),
#     path('export/', export_table, name='export_table'),
#     # path('export/', views.export_table_to_excel, name='export_table'), 
#     # path('process_columns/', views.process_columns,name='process_columns'),
#     # path('match_faiss/', views.match_faiss, name='match_faiss'),
#     # path('download_results/', views.download_results),
#     # path('recommend_columns/', views.recommend_columns),  
#     # path('progress_faiss/', views.progress_faiss), 
#     # path('validate/', views.validate_item),  
#     # path('retrain/', views.retrain_model),
#     # path('export_cleaned_results/', views.export_cleaned_results),
#     # path('undo_validation/', views.undo_validation),
#     # path('upload_database/', views.upload_database),  
    
# ]
