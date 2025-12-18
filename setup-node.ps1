# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Install Node.js LTS using NVM
Write-Host "Installing Node.js LTS..."
nvm install lts

# Use the installed version
Write-Host "Switching to Node.js LTS..."
nvm use lts

# Verify installation
Write-Host "`nNode version:"
node --version
Write-Host "`nNPM version:"
npm --version

# Install dependencies
Write-Host "`nInstalling dependencies..."
npm install

# Start the development server
Write-Host "`nStarting development server..."
npm run dev
