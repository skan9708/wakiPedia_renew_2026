# Wakipedia local development

This checkout uses the `chore/ec2-migration` branch, which contains the AWS migration work. The local database is a separate SQLite file in `backend/db.sqlite3`; production data and server credentials are not included.

## Requirements

- Git
- Node.js LTS and npm
- Python 3.12

## First run on Windows (PowerShell)

```powershell
npm ci
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python.exe backend/manage.py migrate
.\start.ps1
```

Open `http://127.0.0.1:5175/`. The API is at `http://127.0.0.1:8000/api/`, and Swagger is at `http://127.0.0.1:8000/api/swagger/`. The startup script builds the frontend, then runs a local preview and API server. Press Ctrl+C to stop both servers. Run the script again after changing frontend code to rebuild it. If `npm` or `python` is not found after installation, reopen the terminal so the updated PATH is loaded.

The development database starts empty. To use the Django admin locally, create a separate local account with `backend/.venv/Scripts/python.exe backend/manage.py createsuperuser`. Do not use the production administrator credentials in the local database.

Kakao login needs both `VITE_KAKAO_REST_API_KEY` (for Vite) and `KAKAO_REST_API_KEY` (for Django). Set these only in your local shell or ignored `.env` files when you have the development key and a registered local redirect URI. Leave `AWS_STORAGE_BUCKET_NAME` unset to keep uploads in local `backend/media/`. The production `/etc/waki.env`, EC2 SSH key, database backup, and administrator password are not needed for normal local development.
