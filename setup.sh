#!/bin/bash

# Setup script for MCP Azure Deployment Service
# This script automates the installation and configuration process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Default values
SKIP_DEPENDENCY_CHECK=false
AUTO_ACCEPT=false
NODE_VERSION=18

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-dependency-check)
      SKIP_DEPENDENCY_CHECK=true
      shift
      ;;
    --auto-accept)
      AUTO_ACCEPT=true
      shift
      ;;
    --node-version)
      NODE_VERSION="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --skip-dependency-check    Skip system dependency checks"
      echo "  --auto-accept             Automatically accept all prompts"
      echo "  --node-version VERSION    Minimum Node.js version (default: 18)"
      echo "  -h, --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

function print_color() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

function print_header() {
  local title=$1
  echo
  print_color $CYAN "==============================================="
  print_color $CYAN "  $title"
  print_color $CYAN "==============================================="
  echo
}

function print_step() {
  print_color $BLUE "🔧 $1"
}

function print_success() {
  print_color $GREEN "✅ $1"
}

function print_warning() {
  print_color $YELLOW "⚠️  $1"
}

function print_error() {
  print_color $RED "❌ $1"
}

function command_exists() {
  command -v "$1" >/dev/null 2>&1
}

function check_node_version() {
  if ! command_exists node; then
    return 1
  fi
  
  local version=$(node --version | sed 's/v//')
  local major_version=$(echo $version | cut -d. -f1)
  
  if [ "$major_version" -ge "$NODE_VERSION" ]; then
    return 0
  else
    return 1
  fi
}

function install_node() {
  print_step "Installing Node.js..."
  
  # Detect OS and package manager
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command_exists brew; then
      print_color $BLUE "Installing Node.js via Homebrew..."
      brew install node
    else
      print_warning "Homebrew not found. Please install Node.js manually:"
      print_color $YELLOW "1. Visit https://nodejs.org/"
      print_color $YELLOW "2. Download and install Node.js $NODE_VERSION or higher"
      exit 1
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command_exists apt-get; then
      # Ubuntu/Debian
      print_color $BLUE "Installing Node.js via apt..."
      curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
      sudo apt-get install -y nodejs
    elif command_exists yum; then
      # RHEL/CentOS/Fedora
      print_color $BLUE "Installing Node.js via yum..."
      curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
      sudo yum install -y nodejs npm
    elif command_exists dnf; then
      # Fedora (newer)
      print_color $BLUE "Installing Node.js via dnf..."
      curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
      sudo dnf install -y nodejs npm
    else
      print_warning "Package manager not detected. Please install Node.js manually:"
      print_color $YELLOW "1. Visit https://nodejs.org/"
      print_color $YELLOW "2. Download and install Node.js $NODE_VERSION or higher"
      exit 1
    fi
  else
    print_warning "OS not recognized. Please install Node.js manually:"
    print_color $YELLOW "1. Visit https://nodejs.org/"
    print_color $YELLOW "2. Download and install Node.js $NODE_VERSION or higher"
    exit 1
  fi
}

function check_prerequisites() {
  print_header "Checking Prerequisites"
  
  local all_good=true
  
  # Check Bash version
  print_step "Checking Bash version..."
  if [ "${BASH_VERSION%%.*}" -ge 4 ]; then
    print_success "Bash ${BASH_VERSION%%.*} ✓"
  else
    print_error "Bash 4.0+ required (found ${BASH_VERSION%%.*})"
    all_good=false
  fi
  
  # Check Node.js
  print_step "Checking Node.js installation..."
  if check_node_version; then
    local version=$(node --version)
    print_success "Node.js $version ✓"
  else
    if command_exists node; then
      local version=$(node --version)
      print_warning "Node.js $version found (requires v$NODE_VERSION+)"
    else
      print_warning "Node.js not found"
    fi
    
    if [ "$SKIP_DEPENDENCY_CHECK" = false ]; then
      local install=false
      if [ "$AUTO_ACCEPT" = true ]; then
        install=true
      else
        echo -n "Install Node.js automatically? (Y/n): "
        read -r response
        if [[ -z "$response" || "$response" =~ ^[Yy] ]]; then
          install=true
        fi
      fi
      
      if [ "$install" = true ]; then
        install_node
      else
        print_error "Node.js $NODE_VERSION+ is required"
        all_good=false
      fi
    fi
  fi
  
  # Check npm
  print_step "Checking npm..."
  if command_exists npm; then
    local version=$(npm --version)
    print_success "npm $version ✓"
  else
    print_error "npm not found (should come with Node.js)"
    all_good=false
  fi
  
  # Check Git (optional)
  print_step "Checking Git..."
  if command_exists git; then
    local version=$(git --version)
    print_success "$version ✓"
  else
    print_warning "Git not found (recommended for version control)"
  fi
  
  # Check curl (usually available)
  print_step "Checking curl..."
  if command_exists curl; then
    print_success "curl ✓"
  else
    print_warning "curl not found (may be needed for some operations)"
  fi
  
  if [ "$all_good" = false ] && [ "$SKIP_DEPENDENCY_CHECK" = false ]; then
    print_error "Prerequisites not met. Please install missing components."
    exit 1
  fi
  
  print_success "Prerequisites check completed"
}

function install_dependencies() {
  print_header "Installing Dependencies"
  
  print_step "Installing Node.js dependencies..."
  npm install
  
  if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
  else
    print_error "Failed to install dependencies"
    exit 1
  fi
}

function setup_environment() {
  print_header "Environment Configuration"
  
  local env_path=".env"
  local env_example_path=".env.example"
  
  print_step "Checking environment files..."
  
  if [ -f "$env_path" ]; then
    print_warning "Found existing .env file"
    local overwrite=false
    if [ "$AUTO_ACCEPT" = true ]; then
      overwrite=false  # Don't auto-overwrite existing config
    else
      echo -n "Overwrite existing .env file? (y/N): "
      read -r response
      if [[ "$response" =~ ^[Yy] ]]; then
        overwrite=true
      fi
    fi
    
    if [ "$overwrite" = false ]; then
      print_color $YELLOW "Keeping existing .env file"
      return
    fi
  fi
  
  if [ -f "$env_example_path" ]; then
    print_step "Copying .env.example to .env..."
    cp "$env_example_path" "$env_path"
    print_success "Environment template copied"
    
    print_color $MAGENTA "\n📝 Next step: Configure your Azure credentials in .env"
    print_color $MAGENTA "Run: npm run setup-env"
  else
    print_warning ".env.example not found - creating basic template"
    
    cat > "$env_path" << 'EOF'
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
EOF
    
    print_success "Basic .env template created"
  fi
}

function run_health_check() {
  print_header "Running Health Check"
  
  print_step "Building project..."
  npm run build
  
  if [ $? -eq 0 ]; then
    print_success "Build successful"
  else
    print_error "Build failed"
    return
  fi
  
  print_step "Running health check..."
  npm run health-check
  
  if [ $? -eq 0 ]; then
    print_success "Health check passed"
  else
    print_warning "Health check failed - check output above"
  fi
}

function show_next_steps() {
  print_header "Setup Complete! 🎉"
  
  print_color $GREEN "📚 Next steps:"
  echo
  print_color $WHITE "1. Configure Azure credentials:"
  print_color $CYAN "   npm run setup-env"
  echo
  print_color $WHITE "2. Validate configuration:"
  print_color $CYAN "   npm run validate-config"
  echo
  print_color $WHITE "3. Test Azure connection:"
  print_color $CYAN "   npm run test-credentials"
  echo
  print_color $WHITE "4. Try sample deployment:"
  print_color $CYAN "   npm run sample-deploy"
  echo
  print_color $WHITE "5. Start the MCP server:"
  print_color $CYAN "   npm start"
  echo
  print_color $GREEN "📖 Documentation:"
  print_color $WHITE "   • README.md - Quick start guide"
  print_color $WHITE "   • CONTRIBUTING.md - Development guide"
  print_color $WHITE "   • docs/ - Detailed documentation"
  echo
  print_color $GREEN "🆘 Need help?"
  print_color $WHITE "   • Run: npm run health-check"
  print_color $WHITE "   • Check: https://github.com/vushtan/MCP-Azure-Deployment-Service/issues"
}

function main() {
  print_header "MCP Azure Deployment Service Setup"
  print_color $MAGENTA "🚀 Welcome to the automated setup script!"
  print_color $WHITE "This will install dependencies and configure your environment."
  echo
  
  if [ "$AUTO_ACCEPT" = false ]; then
    echo -n "Continue with setup? (Y/n): "
    read -r response
    if [[ "$response" =~ ^[Nn] ]]; then
      print_color $YELLOW "Setup cancelled."
      exit 0
    fi
  fi
  
  # Set trap to handle errors
  trap 'print_error "Setup failed on line $LINENO. Check the error above."; exit 1' ERR
  
  check_prerequisites
  install_dependencies
  setup_environment
  run_health_check
  show_next_steps
  
  print_success "\nSetup completed successfully! 🎉"
}

# Make sure we're in the right directory
if [ ! -f "package.json" ]; then
  print_error "package.json not found. Please run this script from the project root directory."
  exit 1
fi

# Run main function
main "$@"