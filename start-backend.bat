@echo off
cd /d "F:\samlay\KB-konwlege\backend"
call .venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
