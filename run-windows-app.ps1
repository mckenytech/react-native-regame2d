# Run the React Native Windows app with Metro port 8082
$env:RCT_METRO_PORT = "8082"
$env:RCT_PACKAGER_HOST = "localhost"
$env:RCT_DEBUG = "1"
Write-Host "Starting Editor.exe with Metro on port 8082..."
Write-Host "Make sure Metro is running: npm start"
Write-Host ""
Write-Host "If the app crashes, check:"
Write-Host "1. Metro is running on port 8082"
Write-Host "2. Try accessing http://localhost:8082/index.bundle?platform=windows"
Write-Host "3. Check Windows Event Viewer for crash details"
Write-Host ""
& ".\windows\x64\Debug\Editor.exe"

