Write-Host "Installing Southin PeoplePay dependencies..." -ForegroundColor Cyan
pnpm install
Write-Host "Copy .env.example to .env and add your Supabase DATABASE_URL before running db commands." -ForegroundColor Yellow
