# Script automatizado para publicar paquetes en npm
# Uso: .\publish.ps1
# Requisitos: npm login, organización cai-ds creada

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Header {
    param([string]$text, [string]$color = "Cyan")
    Write-Host ""
    Write-Host "╔$(('═' * ($text.Length + 2)))╗" -ForegroundColor $color
    Write-Host "║ $text ║" -ForegroundColor $color
    Write-Host "╚$(('═' * ($text.Length + 2)))╝" -ForegroundColor $color
    Write-Host ""
}

function Write-Step {
    param([string]$text, [int]$number)
    Write-Host "  [$number] $text" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$text)
    Write-Host "  ✓ $text" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$text)
    Write-Host "  ✗ $text" -ForegroundColor Red
}

function Test-Requirement {
    param([string]$command, [string]$name)

    try {
        $output = & $command --version 2>&1
        Write-Success "$name instalado"
        return $true
    }
    catch {
        Write-Error-Custom "$name no encontrado"
        return $false
    }
}

function Publish-Package {
    param(
        [string]$packageName,
        [string]$packagePath,
        [string]$version,
        [string]$tag = "latest"
    )

    Write-Host ""
    Write-Host "📦 Publicando: $packageName@$version" -ForegroundColor Magenta
    Write-Host "   Ubicación: $packagePath" -ForegroundColor DarkGray

    Set-Location $packagePath

    if ($tag -eq "beta") {
        Write-Step "Ejecutando: npm publish --tag beta --access public" 1
        npm publish --tag beta --access public
    } else {
        Write-Step "Ejecutando: npm publish --access public" 1
        npm publish --access public
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Publicación exitosa"

        Write-Step "Esperando 5 segundos antes de verificar..." 2
        Start-Sleep -Seconds 5

        Write-Step "Verificando con npm view..." 3
        $view = npm view $packageName@$version 2>&1
        if ($view -match "ERROR") {
            Write-Error-Custom "Verificación falló"
        } else {
            Write-Success "Paquete verificado en npm registry"
        }
    } else {
        throw "Error al publicar $packageName"
    }

    Set-Location $projectRoot
}

# ============================================================================
# INICIO DEL SCRIPT
# ============================================================================

Clear-Host
Write-Header "CAI Design System - Publicador npm Automatizado" Green

Write-Host "Este script publicará los tres paquetes @cai-ds/* en npm." -ForegroundColor White
Write-Host "Asegúrate de tener:" -ForegroundColor White
Write-Host "  • Sesión de npm activa (npm whoami)" -ForegroundColor White
Write-Host "  • Organización 'cai-ds' creada" -ForegroundColor White
Write-Host "  • Ser miembro de la organización" -ForegroundColor White
Write-Host ""

$continue = Read-Host "¿Deseas continuar? (s/n)"
if ($continue -ne "s") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit 0
}

# ============================================================================
# VERIFICACIÓN DE REQUISITOS
# ============================================================================

Write-Header "Paso 1: Verificación de Requisitos" Cyan

Write-Step "Verificando Node.js..." 1
if (-not (Test-Requirement "node" "Node.js")) {
    Write-Error-Custom "Node.js >= 18.0.0 es requerido"
    exit 1
}

Write-Step "Verificando pnpm..." 2
if (-not (Test-Requirement "pnpm" "pnpm")) {
    Write-Error-Custom "pnpm >= 9.0.0 es requerido"
    exit 1
}

Write-Step "Verificando autenticación npm..." 3
try {
    $whoami = npm whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Autenticado como: $whoami"
    } else {
        throw "No autenticado"
    }
}
catch {
    Write-Error-Custom "No estás autenticado en npm"
    Write-Host ""
    Write-Host "Ejecuta: npm login" -ForegroundColor Yellow
    exit 1
}

Write-Step "Verificando organización cai-ds..." 4
try {
    $org = npm org ls cai-ds 2>&1 | Select-Object -First 5
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Organización cai-ds existe"
    } else {
        throw "No existe"
    }
}
catch {
    Write-Error-Custom "Organización 'cai-ds' no existe"
    Write-Host "Visita: https://www.npmjs.com/org/create" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# PREPARACIÓN DEL REPOSITORIO
# ============================================================================

Write-Header "Paso 2: Preparación del Repositorio" Cyan

Set-Location $projectRoot

Write-Step "Verificando estado de git..." 1
$status = git status --short
if ($status) {
    Write-Host "  Cambios encontrados:" -ForegroundColor Yellow
    Write-Host $status
    $continue = Read-Host "  ¿Continuar? (s/n)"
    if ($continue -ne "s") {
        exit 0
    }
}
Write-Success "Estado git OK"

Write-Step "Instalando dependencias..." 2
pnpm install | Out-Null
Write-Success "Dependencias instaladas"

Write-Step "Compilando archivos dist..." 3
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Error en build"
    exit 1
}
Write-Success "Build completado"

# ============================================================================
# VALIDACIÓN DE PAQUETES
# ============================================================================

Write-Header "Paso 3: Validación de Paquetes" Cyan

$packages = @(
    @{ Name = "tokens"; Path = "$projectRoot\packages\tokens"; File = "dist/cai-tokens.css" },
    @{ Name = "core"; Path = "$projectRoot\packages\core"; File = "dist/cai.css" },
    @{ Name = "platform"; Path = "$projectRoot\packages\platform"; File = "dist/platform.css" }
)

foreach ($pkg in $packages) {
    Write-Step "Validando @cai-ds/$($pkg.Name)..." $packages.IndexOf($pkg) + 1

    Set-Location $pkg.Path
    $packOutput = npm pack --dry-run 2>&1 | Select-Object -Last 3

    if (Test-Path $pkg.File) {
        Write-Success "Archivo $($pkg.File) presente"
    } else {
        Write-Error-Custom "Archivo $($pkg.File) no encontrado"
        exit 1
    }

    Set-Location $projectRoot
}

# ============================================================================
# PUBLICACIÓN DE PAQUETES
# ============================================================================

Write-Header "Paso 4: Publicación de Paquetes" Green

Write-Host "ORDEN DE PUBLICACIÓN:" -ForegroundColor Yellow
Write-Host "  1. @cai-ds/tokens@2.0.0-beta.1 (base)" -ForegroundColor White
Write-Host "  2. @cai-ds/core@2.0.0 (depende de tokens)" -ForegroundColor White
Write-Host "  3. @cai-ds/platform@2.0.0 (depende de core)" -ForegroundColor White
Write-Host ""

$continue = Read-Host "¿Proceder con publicación? (s/n)"
if ($continue -ne "s") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit 0
}

try {
    # Publicar tokens
    Publish-Package "@cai-ds/tokens" "$projectRoot\packages\tokens" "2.0.0-beta.1" "beta"

    # Publicar core
    Publish-Package "@cai-ds/core" "$projectRoot\packages\core" "2.0.0" "latest"

    # Publicar platform
    Publish-Package "@cai-ds/platform" "$projectRoot\packages\platform" "2.0.0" "latest"
}
catch {
    Write-Error-Custom "Error durante publicación: $_"
    exit 1
}

# ============================================================================
# VERIFICACIÓN FINAL
# ============================================================================

Write-Header "Paso 5: Verificación Final" Cyan

$urls = @(
    "https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css",
    "https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css",
    "https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js",
    "https://cdn.jsdelivr.net/npm/@cai-ds/platform@2.0.0/dist/platform.css"
)

Write-Host "Las URLs del CDN pueden tardar 1-10 minutos en estar disponibles." -ForegroundColor Yellow
Write-Host ""
Write-Host "Ahora puedes verificar:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. En npmjs.com:" -ForegroundColor White
Write-Host "   • https://www.npmjs.com/package/@cai-ds/tokens" -ForegroundColor DarkGray
Write-Host "   • https://www.npmjs.com/package/@cai-ds/core" -ForegroundColor DarkGray
Write-Host "   • https://www.npmjs.com/package/@cai-ds/platform" -ForegroundColor DarkGray
Write-Host ""
Write-Host "2. En jsDelivr (después de 1-10 minutos):" -ForegroundColor White
foreach ($url in $urls) {
    Write-Host "   • $url" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "3. Con npm view:" -ForegroundColor White
Write-Host "   • npm view @cai-ds/tokens@2.0.0-beta.1" -ForegroundColor DarkGray
Write-Host "   • npm view @cai-ds/core@2.0.0" -ForegroundColor DarkGray
Write-Host "   • npm view @cai-ds/platform@2.0.0" -ForegroundColor DarkGray
Write-Host ""

Write-Header "¡Publicación Completada!" Green
Write-Host "Los paquetes están disponibles en npm." -ForegroundColor Green
Write-Host "Las URLs del CDN estarán activas en unos minutos." -ForegroundColor Yellow
Write-Host ""
