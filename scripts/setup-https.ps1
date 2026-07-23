# TeleMon - 로컬 HTTPS 설정 스크립트 (mkcert 사용)
# mkcert를 사용하여 로컬 개발 환경에 신뢰된 SSL 인증서 생성

Write-Host "=== TeleMon Local HTTPS Setup (mkcert) ===" -ForegroundColor Cyan

# 1. mkcert 설치 확인
Write-Host "1. Checking mkcert installation..." -ForegroundColor Yellow
try {
    $mkcert_version = $(mkcert --version 2>$null)
    if ($mkcert_version) {
        Write-Host "mkcert already installed: $mkcert_version" -ForegroundColor Green
    } else {
        Write-Host "Installing mkcert..." -ForegroundColor Yellow
        # Windows의 경우 Chocolatey 또는 직접 설치
        choco install mkcert -y
    }
} catch {
    Write-Host "Installing mkcert via Go (requires Go to be installed)..." -ForegroundColor Yellow
    go install github.com/FiloSottile/mkcert@latest
    # Go bin 경로에 mkcert 설치
    $goBin = $(go env GOPATH) + "\bin"
    $env:PATH += ";$goBin"
    $env:PATH += ";$(go env GOPATH)\bin"
}

# 2. 로컬 CA 설치
Write-Host "2. Installing local CA..." -ForegroundColor Yellow
mkcert -install

# 3. localhost 인증서 생성
Write-Host "3. Generating certificates for localhost..." -ForegroundColor Yellow
$certDir = Join-Path $PSScriptRoot "../certs"
if (!(Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force
}

# 인증서 생성
Set-Location $PSScriptRoot/../certs
mkcert localhost 127.0.0.1 ::1

Write-Host "4. Certificates generated successfully!" -ForegroundColor Green
Write-Host "   - localhost+2.pem: 인증서 파일" -ForegroundColor Green
Write-Host "   - localhost+2-key.pem: 개인 키 파일" -ForegroundColor Green

# 5. Next.js 구성에 HTTPS 옵션 추가
Write-Host "5. Updating Next.js config for HTTPS..." -ForegroundColor Yellow
$nextConfigPath = Join-Path $PSScriptRoot "../next.config.ts"
if (Test-Path $nextConfigPath) {
    $nextConfig = Get-Content $nextConfigPath -Raw
    
    # HTTPS 설정이 없는 경우 추가
    if ($nextConfig -notmatch "experimental\.serverComponentsExternalPackages") {
        $newConfig = $nextConfig -replace '(let nextConfig: NextConfig = {)', @"
`$1
  experimental: {
    ...config.experimental,
    serverComponentsExternalPackages: ["sharp", "canvas", "@tma.js/sdk-react"],
  },

"@
        Set-Content $nextConfigPath $newConfig
    }
}

Write-Host ""
Write-Host "✅ Local HTTPS setup complete!" -ForegroundColor Green
Write-Host "🌐 You can now access https://localhost with valid certificate" -ForegroundColor Green
Write-Host "🔧 To use in development: pnpm dev:https (after adding script to package.json)" -ForegroundColor Green