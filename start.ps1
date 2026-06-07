# Wakipedia 개발 서버 시작 스크립트
# 실행: .\start.ps1

Write-Host "Django 백엔드 시작 중 (포트 8000)..." -ForegroundColor Green
Start-Process -FilePath "python" -ArgumentList "backend\manage.py runserver 8000" -WorkingDirectory $PSScriptRoot -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Vite 프론트엔드 시작 중 (포트 5175)..." -ForegroundColor Green
Start-Process -FilePath "npx" -ArgumentList "vite --port 5175" -WorkingDirectory $PSScriptRoot -WindowStyle Normal

Write-Host ""
Write-Host "서버가 시작되었습니다!" -ForegroundColor Cyan
Write-Host "  프론트엔드: http://localhost:5175" -ForegroundColor Yellow
Write-Host "  백엔드 API: http://localhost:8000/api/" -ForegroundColor Yellow
Write-Host "  Swagger:   http://localhost:8000/api/swagger/" -ForegroundColor Yellow
Write-Host "  Admin:     http://localhost:8000/admin/" -ForegroundColor Yellow
Write-Host "             (admin@waki.kr / admin1234)" -ForegroundColor Yellow
