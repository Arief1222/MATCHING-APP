from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
# Import semua view dari folder views
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
    handle_table_operations,
    UserManagementView
)

from .views.auth_views import CustomLoginView

urlpatterns = [
    # Auth Views
    path('login/', CustomLoginView.as_view(), name='user_login'),

    # File Views
    path('upload/', upload_file, name='upload_file'),
    path('table-operations/', handle_table_operations, name='handle_table_operations'), # Ini handle GET (get_table_data) dan DELETE (delete_table_by_name)

    # Table Views
    path('tables/', GetAvailableTablesView.as_view(), name='get_tables'),
    path('tables/<str:table_name>/', TableManagementView.as_view(), name='table_management'), # Ini handle GET (get table detail) dan DELETE (delete table)
    path('tables/bulk/delete/', BulkTableOperationsView.as_view(), name='bulk_table_operations'), # Ini handle BULK DELETE tables

    # Matching Core Views
    path('recommend-columns/', GetRecommendedColumnsView.as_view(), name='recommend_columns'),
    path('prepare-combined/', PrepareCombinedDataView.as_view(), name='prepare_combined'),
    path('start-matching/', StartMatchingView.as_view(), name='start_matching'),
    path('matching-jobs/', MatchingJobListView.as_view(), name='matching_jobs'),
    path('job-status/<str:job_id>/', JobStatusView.as_view(), name='job_status'),
    path('labeling-data/', GetLabelingDataView.as_view(), name='get_labeling_data'),
    path('submit-labeling/', SubmitLabelingView.as_view(), name='submit_labeling'),
    path('retrain-model/', RetrainModelView.as_view(), name='retrain_model'),

    # Matching Result Views
    path('matching-results/', GetMatchingResultsView.as_view(), name='get_matching_results'),
    path('matching-stats/', GetMatchingStatsView.as_view(), name='matching_stats'),
    path('categorized-results/', GetCategorizedMatchResultsView.as_view(), name='categorized_match_results'),
    path('matching-summary/', GetMatchingSummaryView.as_view(), name='matching_summary'),

    # Matching Export Views
    path('export-categorized/', ExportCategorizedResultsView.as_view(), name='export_categorized'),

    # User Views
    path('users/', UserManagementView.as_view(), name='user_management'), # Ini handle GET, POST, PUT, DELETE users
]
