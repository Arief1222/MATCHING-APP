from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from ..utils.Upload_handler import delete_table_by_name, export_table_to_excel, get_table_data, handle_uploaded_file
import tempfile


# Global variables untuk progress tracking
current_progress = {'current': 0, 'total': 1}


@api_view(['GET'])
def progress_faiss(request):
    return Response(current_progress)


@csrf_exempt
@api_view(['POST'])
def upload_file(request):
    import tempfile

    if 'table_name' not in request.POST:
        return Response({'error': 'Parameter table_name wajib disediakan'}, status=400)

    table_name = request.POST['table_name']

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        temp_path = tmp.name

    return handle_uploaded_file(request, temp_path, table_name)


@api_view(['GET', 'DELETE'])
def handle_table_operations(request):
    if request.method == 'GET':
        return get_table_data(request)
    elif request.method == 'DELETE':
        return delete_table_by_name(request)
    

@api_view(['GET'])
def export_table(request):
    return export_table_to_excel(request)