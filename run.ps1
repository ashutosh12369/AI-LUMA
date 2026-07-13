# Start Redis Database
Write-Host "Starting Redis container..." -ForegroundColor Cyan
cd backend
docker-compose up -d
cd ..

# Define all the service paths
$services = @(
    "backend\gateway",
    "backend\services\auth",
    "backend\services\agent",
    "backend\services\billing",
    "backend\services\chat",
    "frontend"
)

# Function to install dependencies and start a service in a new window
foreach ($service in $services) {
    Write-Host "Installing dependencies and starting $service..." -ForegroundColor Green
    
    # Run npm install and npm run dev in a new PowerShell window
    $scriptBlock = "cd '$PWD\$service'; npm install; npm run dev; Read-Host 'Press Enter to close...'"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptBlock
}

Write-Host "All services have been launched in separate windows!" -ForegroundColor Yellow
Write-Host "Please make sure your .env files are correctly configured in each directory." -ForegroundColor Yellow
