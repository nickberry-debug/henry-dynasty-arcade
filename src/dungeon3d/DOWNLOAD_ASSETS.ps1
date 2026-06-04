# Download free assets from Kenney.nl and other sources
# Requires: 7-Zip installed (or built-in Expand-Archive)

$AssetDir = "C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets"
$TempDir = "$AssetDir\temp"

# Create directories
@(
    "$AssetDir\models\dungeon",
    "$AssetDir\models\characters",
    "$AssetDir\models\enemies",
    "$AssetDir\models\items",
    "$AssetDir\audio\music",
    "$AssetDir\audio\sfx",
    "$AssetDir\sprites",
    "$AssetDir\ui",
    $TempDir
) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "✓ Created: $_"
    }
}

Write-Host "`n🐦 Starting asset downloads from Kenney.nl...`n"

# Asset URLs (Kenney hosts direct ZIP downloads)
$Assets = @(
    @{
        Name = "Dungeon Pack"
        URL = "https://kenney.nl/content/downloads/dungeon-pack.zip"
        Dest = "$AssetDir\models\dungeon"
    },
    @{
        Name = "RPG Enemies"
        URL = "https://kenney.nl/content/downloads/rpg-enemies.zip"
        Dest = "$AssetDir\models\enemies"
    },
    @{
        Name = "RPG Characters"
        URL = "https://kenney.nl/content/downloads/rpg-characters.zip"
        Dest = "$AssetDir\models\characters"
    },
    @{
        Name = "RPG Items"
        URL = "https://kenney.nl/content/downloads/rpg-items.zip"
        Dest = "$AssetDir\models\items"
    },
    @{
        Name = "RPG Music"
        URL = "https://kenney.nl/content/downloads/rpg-music.zip"
        Dest = "$AssetDir\audio\music"
    },
    @{
        Name = "RPG SFX"
        URL = "https://kenney.nl/content/downloads/rpg-sound-pack.zip"
        Dest = "$AssetDir\audio\sfx"
    },
    @{
        Name = "RPG Icons"
        URL = "https://kenney.nl/content/downloads/rpg-icons.zip"
        Dest = "$AssetDir\ui"
    }
)

# Download and extract each asset
foreach ($Asset in $Assets) {
    $ZipPath = "$TempDir\$($Asset.Name).zip"
    
    Write-Host "📥 Downloading $($Asset.Name)..." -ForegroundColor Cyan
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $Asset.URL -OutFile $ZipPath -TimeoutSec 300
        
        Write-Host "✓ Downloaded: $($Asset.Name)" -ForegroundColor Green
        Write-Host "📦 Extracting to $($Asset.Dest)..." -ForegroundColor Cyan
        
        Expand-Archive -Path $ZipPath -DestinationPath $Asset.Dest -Force
        
        Write-Host "✓ Extracted: $($Asset.Name)" -ForegroundColor Green
        Remove-Item $ZipPath -Force
    }
    catch {
        Write-Host "✗ Failed to download $($Asset.Name): $_" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n✅ Asset downloads complete!" -ForegroundColor Green
Write-Host "`n📊 Asset Summary:"
@(
    "$AssetDir\models\dungeon",
    "$AssetDir\models\enemies",
    "$AssetDir\models\characters",
    "$AssetDir\models\items",
    "$AssetDir\audio\music",
    "$AssetDir\audio\sfx"
) | ForEach-Object {
    $count = (Get-ChildItem $_ -Recurse -File | Measure-Object).Count
    Write-Host "  $([System.IO.Path]::GetFileName($_)): $count files"
}

Write-Host "`n🐦 Ready to use! Update assetLoader.ts to load these assets."
Write-Host "`nNote: You now have ~300MB of free, CC0-licensed assets."

# Cleanup temp directory
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
