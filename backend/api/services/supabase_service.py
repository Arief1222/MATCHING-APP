import os
import pandas as pd
from supabase import create_client, Client
from django.conf import settings

class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    
    # def create_table_from_dataframe(self, table_name: str, df: pd.DataFrame):
    #     """Buat tabel baru di Supabase dari DataFrame"""
    #     try:
    #         # Convert DataFrame to list of dictionaries
    #         data = df.to_dict('records')
            
    #         # Insert data ke Supabase
    #         result = self.client.table(f"table_{table_name}").insert(data).execute()
    #         return True, len(data)
    #     except Exception as e:
    #         return False, str(e)
    
    def get_table_data(self, table_name: str, page_size: int = 10000):
        """Ambil semua data dari tabel Supabase secara bertahap"""
        all_data = []
        offset = 0
        while True:
            result = self.client.table(table_name).select("*").range(offset, offset + page_size - 1).execute()
            data = result.data
            if not data:
                break
            all_data.extend(data)
            offset += page_size
            print(f"🔄 Retrieved {len(data)} rows (total so far: {len(all_data)})")
        return pd.DataFrame(all_data)

    
    def get_table_columns(self, table_name: str):
        """Ambil nama kolom dari tabel"""
        try:
            result = self.client.table(f"{table_name}").select("*").limit(1).execute()
            if result.data:
                return list(result.data[0].keys())
            return []
        except Exception as e:
            print(f"Error getting table columns: {e}")
            return []
    
    def get_available_tables(self):
        """Ambil daftar tabel yang tersedia"""
        try:
            # Query untuk mendapatkan daftar tabel yang dimulai dengan 'table_'
            result = self.client.rpc('get_table_list').execute()
            return [table for table in result.data if table.startswith('table_')]
        except Exception as e:
            print(f"Error getting available tables: {e}")
            return []