# Start dev server in background
$serverProcess = Start-Process -NoNewWindow -PassThru -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "C:\Users\Usuario01\ITAD-ERP-GUATEMALA"

# Wait for server to start
Start-Sleep -Seconds 10

# Run the test
Write-Host "Testing expense POST..."
node "C:\Users\Usuario01\ITAD-ERP-GUATEMALA\test_expense_post.js"

# Kill the server
Stop-Process -Id $serverProcess.Id -Force
