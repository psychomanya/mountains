[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$CommitMessage = "Update project files",

    [Parameter()]
    [string]$RepoName = "",

    [Parameter()]
    [string]$RemoteUrl = "",

    [Parameter()]
    [string]$Branch = "main",

    [Parameter()]
    [switch]$Force
)

# 1. Ensure Git is in PATH
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $gitPaths = @(
        "C:\Users\marym\AppData\Local\Programs\Git\cmd",
        "C:\Program Files\Git\cmd",
        "C:\Program Files (x86)\Git\cmd"
    )
    foreach ($p in $gitPaths) {
        if (Test-Path "$p\git.exe") {
            $env:PATH = "$p;$env:PATH"
            break
        }
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git не найден на компьютере. Установите Git или добавьте путь к git.exe в PATH."
    exit 1
}

# 2. Bypass agent loopback proxy (Crucial: prevents HTTP 407 error!)
$env:NO_PROXY = "github.com,*.github.com,api.github.com,localhost,127.0.0.1"
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:ALL_PROXY = ""

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Автоматическая публикация на GitHub (пользователь: psychomanya)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 3. Check if inside git repository
$isGit = & git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Инициализируем новый репозиторий Git..." -ForegroundColor Yellow
    & git init -b $Branch
    if ($LASTEXITCODE -ne 0) {
        & git init
        & git branch -M $Branch
    }
}

# 4. Ensure user identity
$currentUser = & git config user.name
$currentEmail = & git config user.email
if (-not $currentUser) {
    & git config user.name "psychomanya"
}
if (-not $currentEmail) {
    & git config user.email "psychomanya@users.noreply.github.com"
}

# 5. Remote configuration
$existingRemote = & git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0 -or -not $existingRemote) {
    if ($RemoteUrl) {
        Write-Host "Добавляем remote origin: $RemoteUrl" -ForegroundColor Yellow
        & git remote add origin $RemoteUrl
    } elseif ($RepoName) {
        $targetUrl = "https://github.com/psychomanya/$RepoName.git"
        Write-Host "Добавляем remote origin: $targetUrl" -ForegroundColor Yellow
        & git remote add origin $targetUrl
    } else {
        Write-Host "Внимание: remote 'origin' не настроен." -ForegroundColor Yellow
        Write-Host "Используйте параметр -RepoName '<имя>' для привязки к репозиторию." -ForegroundColor Yellow
    }
} else {
    Write-Host "Текущий remote origin: $existingRemote" -ForegroundColor Green
}

# 6. Stage and commit
Write-Host "Индексируем файлы..." -ForegroundColor Cyan
& git add .

$status = & git status --porcelain
if ($status) {
    Write-Host "Создаем коммит: '$CommitMessage'..." -ForegroundColor Cyan
    & git commit -m "$CommitMessage"
} else {
    Write-Host "Нет новых изменений для коммита." -ForegroundColor Yellow
}

# 7. Push
$currentRemote = & git remote get-url origin 2>$null
if ($currentRemote) {
    Write-Host "Отправляем изменения в ветку '$Branch' на GitHub..." -ForegroundColor Cyan
    if ($Force) {
        & git push -u origin $Branch --force
    } else {
        & git push -u origin $Branch
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host " Успешно опубликовано на GitHub!" -ForegroundColor Green
        Write-Host "Репозиторий доступен по адресу: $currentRemote" -ForegroundColor Green
    } else {
        Write-Error "Ошибка при отправке в репозиторий. Проверьте актуальность ветки (git pull --rebase origin $Branch)."
        exit 1
    }
} else {
    Write-Host "Коммит создан локально. Укажите remote origin перед отправкой." -ForegroundColor Yellow
}
