# EventHorizon Dev Tool
# A helper script to manage the local development environment

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "      EventHorizon Dev Tool" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "1. Start Backend & DB (Docker)"
    Write-Host "2. Stop Backend & DB"
    Write-Host "3. Rebuild Backend Container"
    Write-Host "4. Run Database Migrations (alembic upgrade head)"
    Write-Host "5. Create New Migration (alembic revision)"
    Write-Host "6. Start Frontend (Local - New Window)"
    Write-Host "7. Start FULL Environment (Backend + Frontend)"
    Write-Host "8. View Backend Logs"
    Write-Host "9. Prune Docker System (Clean up)"
    Write-Host "10. Fresh Start (Wipe DB & Restart)" -ForegroundColor Magenta
    Write-Host "q. Quit"
    Write-Host "========================================" -ForegroundColor Cyan
}

function Run-Command {
    param (
        [string]$Command,
        [string]$ErrorMessage = "Command failed"
    )
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: $ErrorMessage" -ForegroundColor Red
        Pause
    }
}

while ($true) {
    Show-Menu
    $choice = Read-Host "Select an option"

    switch ($choice) {
        "1" {
            Write-Host "Starting Backend and Database..." -ForegroundColor Yellow
            Run-Command "docker-compose -f docker-compose.dev.yml up -d" "Failed to start docker containers"
            Write-Host "Backend started on http://localhost:8000" -ForegroundColor Green
            Pause
        }
        "2" {
            Write-Host "Stopping containers..." -ForegroundColor Yellow
            Run-Command "docker-compose -f docker-compose.dev.yml down" "Failed to stop containers"
            Write-Host "Containers stopped." -ForegroundColor Green
            Pause
        }
        "3" {
            Write-Host "Rebuilding Backend..." -ForegroundColor Yellow
            Run-Command "docker-compose -f docker-compose.dev.yml up -d --build backend" "Failed to rebuild backend"
            Write-Host "Backend rebuilt and restarted." -ForegroundColor Green
            Pause
        }
        "4" {
            Write-Host "Running Migrations..." -ForegroundColor Yellow
            Run-Command "docker-compose -f docker-compose.dev.yml run --rm backend alembic upgrade head" "Migration failed"
            Write-Host "Migrations completed." -ForegroundColor Green
            Pause
        }
        "5" {
            $msg = Read-Host "Enter migration message"
            if ($msg) {
                Write-Host "Creating migration..." -ForegroundColor Yellow
                Run-Command "docker-compose -f docker-compose.dev.yml run --rm backend alembic revision --autogenerate -m `"$msg`"" "Failed to create migration"
                Write-Host "Migration created." -ForegroundColor Green
            }
            Pause
        }
        "6" {
            Write-Host "Starting Frontend in new window..." -ForegroundColor Yellow
            if (Test-Path "frontend") {
                Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
            } else {
                Write-Host "Frontend directory not found!" -ForegroundColor Red
            }
        }
        "7" {
            Write-Host "Starting Backend..." -ForegroundColor Yellow
            Run-Command "docker-compose -f docker-compose.dev.yml up -d" "Failed to start backend"
            
            Write-Host "Starting Frontend..." -ForegroundColor Yellow
            if (Test-Path "frontend") {
                Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
            }
            Write-Host "Environment started." -ForegroundColor Green
            Pause
        }
        "8" {
            Write-Host "Tailing logs (Ctrl+C to stop)..." -ForegroundColor Yellow
            Run-Command "docker-compose -f docker-compose.dev.yml logs -f backend"
        }
        "9" {
            Write-Host "Pruning docker system..." -ForegroundColor Yellow
            Run-Command "docker system prune -f"
            Pause
        }
        "10" {
            Write-Host "WARNING: This will delete all data in the database!" -ForegroundColor Red
            $confirm = Read-Host "Are you sure? (y/n)"
            if ($confirm -eq 'y') {
                Write-Host "Wiping database and restarting containers..." -ForegroundColor Yellow
                Run-Command "docker-compose -f docker-compose.dev.yml down -v" "Failed to wipe database"
                Run-Command "docker-compose -f docker-compose.dev.yml up -d" "Failed to restart containers"
                
                Write-Host "Waiting for DB to be ready (5s)..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
                
                Write-Host "Running Migrations manually to ensure schema..." -ForegroundColor Yellow
                Run-Command "docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head" "Migration failed"
                
                Write-Host "Seeding Activities..." -ForegroundColor Yellow
                Run-Command "docker-compose -f docker-compose.dev.yml exec backend python scripts/seed_activities.py --force" "Seeding failed"
                
                Write-Host "Fresh start completed successfully!" -ForegroundColor Green
            } else {
                Write-Host "Aborted." -ForegroundColor Yellow
            }
            Pause
        }
        "q" {
            exit
        }
        Default {
            Write-Host "Invalid option" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
