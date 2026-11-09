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

The production frontend uses the public GA4 measurement ID in `.env.production`. Analytics remains disabled until the GA4 stream settings are confirmed and `VITE_GA_STREAM_READY` is set to `true`, then requires visitor consent and the announced 2026-11-14 start date. Local development remains untracked unless both Vite variables are set explicitly. See [docs/analytics-setup.md](docs/analytics-setup.md) for web stream settings and reports.

## Production frontend deployment

Build with the existing `VITE_KAKAO_REST_API_KEY` supplied only for the build process, then deploy the resulting `dist/` with `deploy-frontend.ps1`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deploy-frontend.ps1 -PemPath "C:\path\to\wakipedia.pem"
```

The script uploads assets one file at a time, checks that nginx can read them and serves the right content types, then uploads `index.html` last. This order prevents a blank page caused by unreadable JavaScript or CSS. Keep the SSH key and Kakao key outside the repository.
