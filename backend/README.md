**Struktur Folder Backend**

├── api
│   ├── admin.py
│   ├── apps.py
│   ├── migrations
│   │   ├── 0001_initial.py
│   │   ├── 0002_remove_labelingdata_employee_and_more.py
│   ├── models.py
│   ├── permission.py
│   ├── serializers.py
│   ├── services
│   │   ├── match_engine.py
│   │   └── supabase_service.py
│   ├── signals.py
│   ├── tests.py
│   ├── urls.py
│   ├── utils
│   │   └── Upload_handler.py
│   └── views
│       ├── assignment_detail_views.py
│       ├── assignment_views.py
│       ├── auth_views.py
│       ├── employee_labeling_views.py
│       ├── employee_views.py
│       ├── file_views.py
│       ├── legacy_views.py
│       ├── matching_core_views.py
│       ├── matching_export_views.py
│       ├── matching_result_views.py
│       ├── table_views.py
│       └── user_views.py
├── combined.json
├── db.sqlite3
├── env
│   ├── Include
│   ├── Lib
│   │   └── site-packages
│   ├── Scripts
├── exports
│   ├── match_results_20250722_180611.csv
│   ├── match_results_20250722_180611.xlsx
│   ├── match_results_20250722_184219.xlsx
│   ├── match_results_20250730_151800.xlsx
│   ├── match_results_20250730_151809.csv
│   ├── match_results_20250731_072404.xlsx
│   ├── match_results_20250803_225520.xlsx
│   └── unmatch_results_20250803_214746.xlsx
├── final_cleaned_output.xlsx
├── manage.py
├── matching_project
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── requirements.txt
├── training_data.json
└── xgb_model_faiss.json
