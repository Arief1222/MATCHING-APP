from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..permission import IsSuperadmin, IsKepalaBPS, IsEmployee
from rest_framework.permissions import IsAuthenticated
import logging


logger = logging.getLogger(__name__)


class GetAvailableTablesView(APIView):
    def get(self, request):
        try:
            logger.info("=== GetAvailableTablesView Start ===")

            excluded_tables = (
                'auth_group',
                'auth_group_permissions',
                'auth_permission',
                'auth_user',
                'auth_user_groups',
                'auth_user_user_permissions',
                'background_task',
                'background_task_completedtask',
                'django_admin_log',
                'django_content_type',
                'django_migrations',
                'django_session'
            )

            placeholders = ','.join(['%s'] * len(excluded_tables))

            # Query untuk mendapatkan informasi detail tabel
            query = f"""
                SELECT 
                    t.table_name,
                    COALESCE(c.column_count, 0) as column_count,
                    COALESCE(s.n_tup_ins, 0) as estimated_rows,
                    pg_size_pretty(COALESCE(pg_total_relation_size(quote_ident(t.table_name)::regclass), 0)) as table_size,
                    COALESCE(pg_stat_user_tables.last_vacuum, pg_stat_user_tables.last_autovacuum, 
                             pg_stat_user_tables.last_analyze, pg_stat_user_tables.last_autoanalyze) as last_modified
                FROM information_schema.tables t
                LEFT JOIN (
                    SELECT table_name, COUNT(*) as column_count
                    FROM information_schema.columns 
                    WHERE table_schema = 'public'
                    GROUP BY table_name
                ) c ON t.table_name = c.table_name
                LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
                LEFT JOIN pg_stat_user_tables ON t.table_name = pg_stat_user_tables.relname
                WHERE t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
                AND t.table_name NOT IN ({placeholders})
                ORDER BY t.table_name
            """

            with connection.cursor() as cursor:
                cursor.execute(query, excluded_tables)
                result = cursor.fetchall()
            
            tables_list = []
            for row in result:
                table_info = {
                    'name': row[0],
                    'columns': row[1] or 0,
                    'records': row[2] or 0,
                    'size': row[3] or '0 bytes',
                    'last_modified': row[4].isoformat() if row[4] else None,
                    'status': 'active'  # Semua tabel yang ada dianggap aktif
                }
                tables_list.append(table_info)
            
            return Response({
                'tables': tables_list,
                'total': len(tables_list)
            })
        
        except Exception as e:
            logger.error(f"Error in GetAvailableTablesView: {e}", exc_info=True)
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TableManagementView(APIView):
    """
    View untuk CRUD operations pada tabel
    """
    
    def get_permissions(self):
        # Todo: test apakah sudah benar
        """
        Return the appropriate permissions based on HTTP method.
        """
        if self.request.method == 'GET':
            return [IsAuthenticated(), IsKepalaBPS() | IsSuperadmin() | IsEmployee()]
        else:
            # Selain GET, hanya superadmin dan employee yang diizinkan
            return [IsAuthenticated(), IsSuperadmin() | IsEmployee()]
    
    def delete(self, request, table_name):
        """
        Menghapus tabel dari database
        """
        try:
            logger.info(f"=== Deleting table: {table_name} ===")
            
            # Validasi nama tabel untuk menghindari SQL injection
            if not self._is_valid_table_name(table_name):
                return Response({
                    'error': 'Invalid table name'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cek apakah tabel ada
            if not self._table_exists(table_name):
                return Response({
                    'error': f'Table {table_name} does not exist'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Cek apakah tabel tidak dalam daftar yang dilindungi
            excluded_tables = {
                'auth_group', 'auth_group_permissions', 'auth_permission',
                'auth_user', 'auth_user_groups', 'auth_user_user_permissions',
                'background_task', 'background_task_completedtask',
                'django_admin_log', 'django_content_type', 'django_migrations',
                'django_session'
            }
            
            if table_name in excluded_tables:
                return Response({
                    'error': f'Table {table_name} is protected and cannot be deleted'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Hapus tabel
            with connection.cursor() as cursor:
                cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
            
            logger.info(f"Table {table_name} deleted successfully")
            
            return Response({
                'message': f'Table {table_name} deleted successfully'
            })
        
        except Exception as e:
            logger.error(f"Error deleting table {table_name}: {e}", exc_info=True)
            return Response({
                'error': f'Failed to delete table: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, table_name):
        """
        Mendapatkan detail tabel tertentu
        """
        try:
            logger.info(f"=== Getting table details: {table_name} ===")
            
            if not self._is_valid_table_name(table_name):
                return Response({
                    'error': 'Invalid table name'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not self._table_exists(table_name):
                return Response({
                    'error': f'Table {table_name} does not exist'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Query untuk mendapatkan detail tabel
            table_info_query = """
                SELECT 
                    t.table_name,
                    t.table_type,
                    COUNT(c.column_name) as column_count,
                    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) as table_size,
                    pg_total_relation_size(quote_ident(t.table_name)::regclass) as table_size_bytes
                FROM information_schema.tables t
                LEFT JOIN information_schema.columns c ON t.table_name = c.table_name 
                    AND t.table_schema = c.table_schema
                WHERE t.table_schema = 'public'
                AND t.table_name = %s
                GROUP BY t.table_name, t.table_type
            """
            
            # Query untuk mendapatkan informasi kolom
            columns_query = """
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = %s
                ORDER BY ordinal_position
            """
            
            # Query untuk mendapatkan statistik tabel
            stats_query = """
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as total_inserts,
                    n_tup_upd as total_updates,
                    n_tup_del as total_deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                WHERE tablename = %s
            """
            
            with connection.cursor() as cursor:
                # Dapatkan info dasar tabel
                cursor.execute(table_info_query, [table_name])
                table_info = cursor.fetchone()
                
                # Dapatkan info kolom
                cursor.execute(columns_query, [table_name])
                columns = cursor.fetchall()
                
                # Dapatkan statistik
                cursor.execute(stats_query, [table_name])
                stats = cursor.fetchone()
                
                # Dapatkan jumlah baris aktual
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                actual_rows = cursor.fetchone()[0]
            
            # Format response
            table_detail = {
                'name': table_info[0] if table_info else table_name,
                'type': table_info[1] if table_info else 'BASE TABLE',
                'column_count': table_info[2] if table_info else 0,
                'size': table_info[3] if table_info else '0 bytes',
                'size_bytes': table_info[4] if table_info else 0,
                'actual_rows': actual_rows,
                'columns': [
                    {
                        'name': col[0],
                        'type': col[1],
                        'nullable': col[2] == 'YES',
                        'default': col[3],
                        'max_length': col[4]
                    } for col in columns
                ],
                'statistics': {
                    'total_inserts': stats[2] if stats else 0,
                    'total_updates': stats[3] if stats else 0,
                    'total_deletes': stats[4] if stats else 0,
                    'live_tuples': stats[5] if stats else 0,
                    'dead_tuples': stats[6] if stats else 0,
                    'last_vacuum': stats[7].isoformat() if stats and stats[7] else None,
                    'last_autovacuum': stats[8].isoformat() if stats and stats[8] else None,
                    'last_analyze': stats[9].isoformat() if stats and stats[9] else None,
                    'last_autoanalyze': stats[10].isoformat() if stats and stats[10] else None,
                } if stats else None
            }
            
            return Response(table_detail)
        
        except Exception as e:
            logger.error(f"Error getting table details {table_name}: {e}", exc_info=True)
            return Response({
                'error': f'Failed to get table details: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _is_valid_table_name(self, table_name):
        """
        Validasi nama tabel untuk menghindari SQL injection
        """
        import re
        # Nama tabel harus terdiri dari huruf, angka, underscore, dan tidak boleh dimulai dengan angka
        pattern = r'^[a-zA-Z_][a-zA-Z0-9_]*$'
        return re.match(pattern, table_name) is not None and len(table_name) <= 63
    
    def _table_exists(self, table_name):
        """
        Cek apakah tabel exists
        """
        query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = %s
            )
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [table_name])
            return cursor.fetchone()[0]


class BulkTableOperationsView(APIView):
    """
    View untuk operasi bulk pada multiple tabel
    """
    
    permissions_classes = [IsSuperadmin]
    
    def delete(self, request):
        """
        Bulk delete multiple tables
        """
        try:
            table_names = request.data.get('table_names', [])
            
            if not table_names or not isinstance(table_names, list):
                return Response({
                    'error': 'table_names must be a non-empty list'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validasi semua nama tabel
            excluded_tables = {
                'auth_group', 'auth_group_permissions', 'auth_permission',
                'auth_user', 'auth_user_groups', 'auth_user_user_permissions',
                'background_task', 'background_task_completedtask',
                'django_admin_log', 'django_content_type', 'django_migrations',
                'django_session'
            }
            
            invalid_tables = []
            protected_tables = []
            missing_tables = []
            
            table_management = TableManagementView()
            
            for table_name in table_names:
                if not table_management._is_valid_table_name(table_name):
                    invalid_tables.append(table_name)
                elif table_name in excluded_tables:
                    protected_tables.append(table_name)
                elif not table_management._table_exists(table_name):
                    missing_tables.append(table_name)
            
            # Return error jika ada masalah dengan tabel
            if invalid_tables or protected_tables or missing_tables:
                error_details = {}
                if invalid_tables:
                    error_details['invalid_tables'] = invalid_tables
                if protected_tables:
                    error_details['protected_tables'] = protected_tables
                if missing_tables:
                    error_details['missing_tables'] = missing_tables
                
                return Response({
                    'error': 'Some tables cannot be deleted',
                    'details': error_details
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Hapus semua tabel yang valid
            deleted_tables = []
            failed_tables = []
            
            for table_name in table_names:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                    deleted_tables.append(table_name)
                    logger.info(f"Table {table_name} deleted successfully")
                except Exception as e:
                    failed_tables.append({'table': table_name, 'error': str(e)})
                    logger.error(f"Failed to delete table {table_name}: {e}")
            
            return Response({
                'message': f'Bulk delete completed',
                'deleted_tables': deleted_tables,
                'failed_tables': failed_tables,
                'total_deleted': len(deleted_tables),
                'total_failed': len(failed_tables)
            })
        
        except Exception as e:
            logger.error(f"Error in bulk delete: {e}", exc_info=True)
            return Response({
                'error': f'Bulk delete failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)