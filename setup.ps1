# PowerShell setup script for MCP Azure Deployment Service
# This script automates the installation and configuration process

param(
    [switch]$SkipDependencyCheck,
    [switch]$AutoAccept,
    [string]$NodeVersion = "18"
)

$ErrorActionPreference = "Stop"

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m" 
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Magenta = "`e[35m"
$Cyan = "`e[36m"
$White = "`e[37m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = $White
    )
    Write-Host "$Color$Message$Reset"
}

function Write-Header {
    param([string]$Title)
    Write-ColorOutput "`n===============================================" $Cyan
    Write-ColorOutput "  $Title" $Cyan  
    Write-ColorOutput "===============================================`n" $Cyan
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🔧 $Message" $Blue
}

function Write-Success {
    param([string]$Message) 
    Write-ColorOutput "✅ $Message" $Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $Red
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-NodeVersion {
    if (-not (Test-Command "node")) {
        return $false
    }
    
    $version = node --version
    $majorVersion = [int]($version -replace 'v(\d+).*', '$1')
    return $majorVersion -ge $NodeVersion
}

function Install-NodeJS {
    Write-Step "Installing Node.js..."
    
    if (Test-Command "winget") {
        Write-ColorOutput "Installing Node.js via winget..." $Blue
        winget install OpenJS.NodeJS
    }
    elseif (Test-Command "choco") {
        Write-ColorOutput "Installing Node.js via Chocolatey..." $Blue
        choco install nodejs -y
    }
    else {
        Write-Warning "Neither winget nor Chocolatey found."
        Write-ColorOutput "Please install Node.js manually:" $Yellow
        Write-ColorOutput "1. Visit https://nodejs.org/" $Yellow
        Write-ColorOutput "2. Download and install Node.js $NodeVersion or higher" $Yellow
        Write-ColorOutput "3. Restart PowerShell and run this script again" $Yellow
        exit 1
    }
}

function Test-Prerequisites {
    Write-Header "Checking Prerequisites"
    
    $allGood = $true
    
    # Check PowerShell version
    Write-Step "Checking PowerShell version..."
    if ($PSVersionTable.PSVersion.Major -ge 5) {
        Write-Success "PowerShell $($PSVersionTable.PSVersion.Major).$($PSVersionTable.PSVersion.Minor) ✓"
    } else {
        Write-Error "PowerShell 5.0 or higher required"
        $allGood = $false
    }
    
    # Check Node.js
    Write-Step "Checking Node.js installation..."
    if (Test-NodeVersion) {
        $version = node --version
        Write-Success "Node.js $version ✓"
    } else {
        if (Test-Command "node") {
            $version = node --version
            Write-Warning "Node.js $version found (requires v$NodeVersion+)"
        } else {
            Write-Warning "Node.js not found"
        }
        
        if (-not $SkipDependencyCheck) {
            $install = $AutoAccept
            if (-not $install) {
                $response = Read-Host "Install Node.js automatically? (Y/n)"
                $install = $response -eq "" -or $response -match "^[Yy]"
            }
            
            if ($install) {
                Install-NodeJS
            } else {
                Write-Error "Node.js $NodeVersion+ is required"
                $allGood = $false
            }
        }
    }
    
    # Check npm
    Write-Step "Checking npm..."
    if (Test-Command "npm") {
        $version = npm --version
        Write-Success "npm $version ✓"
    } else {
        Write-Error "npm not found (should come with Node.js)"
        $allGood = $false
    }
    
    # Check Git (optional)
    Write-Step "Checking Git..."
    if (Test-Command "git") {
        $version = git --version
        Write-Success "$version ✓"
    } else {
        Write-Warning "Git not found (recommended for version control)"
    }
    
    if (-not $allGood -and -not $SkipDependencyCheck) {
        Write-Error "Prerequisites not met. Please install missing components."
        exit 1
    }
    
    Write-Success "Prerequisites check completed"
}

function Install-Dependencies {
    Write-Header "Installing Dependencies"
    
    Write-Step "Installing Node.js dependencies..."
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed successfully"
    } else {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

function Setup-Environment {
    Write-Header "Environment Configuration"
    
    $envPath = ".env"
    $envExamplePath = ".env.example"
    
    Write-Step "Checking environment files..."
    
    if (Test-Path $envPath) {
        Write-Warning "Found existing .env file"
        $overwrite = $AutoAccept
        if (-not $overwrite) {
            $response = Read-Host "Overwrite existing .env file? (y/N)"
            $overwrite = $response -match "^[Yy]"
        }
        
        if (-not $overwrite) {
            Write-ColorOutput "Keeping existing .env file" $Yellow
            return
        }
    }
    
    if (Test-Path $envExamplePath) {
        Write-Step "Copying .env.example to .env..."
        Copy-Item $envExamplePath $envPath
        Write-Success "Environment template copied"
        
        Write-ColorOutput "`n📝 Next step: Configure your Azure credentials in .env" $Magenta
        Write-ColorOutput "Run: npm run setup-env" $Magenta
    } else {
        Write-Warning ".env.example not found - creating basic template"
        
        $basicEnv = @"
# Azure Configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id-here
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_DEFAULT_REGION=eastus
AZURE_RESOURCE_GROUP_PREFIX=mcp-rg

# Environment Configuration
NODE_ENV=development
LOG_LEVEL=info
"@
        
        Set-Content -Path $envPath -Value $basicEnv
        Write-Success "Basic .env template created"
    }
}

function Run-HealthCheck {
    Write-Header "Running Health Check"
    
    Write-Step "Building project..."
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Build successful"
    } else {
        Write-Error "Build failed"
        return
    }
    
    Write-Step "Running health check..."
    npm run health-check
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Health check passed"
    } else {
        Write-Warning "Health check failed - check output above"
    }
}

function Show-NextSteps {
    Write-Header "Setup Complete! 🎉"
    
    Write-ColorOutput "📚 Next steps:" $Green
    Write-ColorOutput ""
    Write-ColorOutput "1. Configure Azure credentials:" $White
    Write-ColorOutput "   npm run setup-env" $Cyan
    Write-ColorOutput ""
    Write-ColorOutput "2. Validate configuration:" $White
    Write-ColorOutput "   npm run validate-config" $Cyan
    Write-ColorOutput ""
    Write-ColorOutput "3. Test Azure connection:" $White
    Write-ColorOutput "   npm run test-credentials" $Cyan
    Write-ColorOutput ""
    Write-ColorOutput "4. Try sample deployment:" $White
    Write-ColorOutput "   npm run sample-deploy" $Cyan
    Write-ColorOutput ""
    Write-ColorOutput "5. Start the MCP server:" $White
    Write-ColorOutput "   npm start" $Cyan
    Write-ColorOutput ""
    Write-ColorOutput "📖 Documentation:" $Green
    Write-ColorOutput "   • README.md - Quick start guide" $White
    Write-ColorOutput "   • CONTRIBUTING.md - Development guide" $White
    Write-ColorOutput "   • docs/ - Detailed documentation" $White
    Write-ColorOutput ""
    Write-ColorOutput "🆘 Need help?" $Green
    Write-ColorOutput "   • Run: npm run health-check" $White
    Write-ColorOutput "   • Check: https://github.com/vushtan/MCP-Azure-Deployment-Service/issues" $White
}

# Main execution
function Main {
    Write-Header "MCP Azure Deployment Service Setup"
    Write-ColorOutput "🚀 Welcome to the automated setup script!" $Magenta
    Write-ColorOutput "This will install dependencies and configure your environment.`n" $White
    
    if (-not $AutoAccept) {
        $response = Read-Host "Continue with setup? (Y/n)"
        if ($response -match "^[Nn]") {
            Write-ColorOutput "Setup cancelled." $Yellow
            exit 0
        }
    }
    
    try {
        Test-Prerequisites
        Install-Dependencies  
        Setup-Environment
        Run-HealthCheck
        Show-NextSteps
        
        Write-Success "`nSetup completed successfully! 🎉"
    }
    catch {
        Write-Error "Setup failed: $_"
        Write-ColorOutput "`n🔧 Troubleshooting:" $Yellow
        Write-ColorOutput "1. Check the error message above" $White
        Write-ColorOutput "2. Ensure you have admin privileges if needed" $White
        Write-ColorOutput "3. Try running individual steps manually" $White
        Write-ColorOutput "4. Visit our documentation for help" $White
        exit 1
    }
}

# Run main function
Main