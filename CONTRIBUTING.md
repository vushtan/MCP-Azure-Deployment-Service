# Contributing to MCP Azure Deployment Service

Thank you for your interest in contributing to the MCP Azure Deployment Service! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **Git**: Latest version
- **Azure Account**: With appropriate permissions for resource creation

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/MCP-Azure-Deployment-Service.git
   cd MCP-Azure-Deployment-Service
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure credentials
   ```

4. **Verify Setup**
   ```bash
   npm run health-check
   ```

## 🔧 Development Workflow

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format
```

### Testing

All changes must include appropriate tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Coverage Requirements:**
- Minimum 90% statement coverage
- All new functions must have tests
- Critical paths must be thoroughly tested

### Type Safety

This project uses TypeScript. Ensure all code is properly typed:

```bash
# Type check
npm run type-check

# Build to verify types
npm run build
```

## 📝 Pull Request Process

### Before Submitting

1. **Update Documentation**: Ensure README.md and relevant docs are updated
2. **Add Tests**: Include tests for new functionality
3. **Check Coverage**: Maintain >90% test coverage
4. **Lint Code**: Ensure code passes all linting rules
5. **Update Changelog**: Add entry to CHANGELOG.md (if exists)

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Coverage maintained >90%
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Commit Message Format

Use conventional commit format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tool changes

**Examples:**
```
feat(azure): add support for App Service deployment
fix(config): handle missing environment variables
docs(readme): update installation instructions
test(azure-client): add retry mechanism tests
```

## 🏗️ Project Structure

```
src/
├── config/          # Configuration management
├── server/          # MCP server implementation
├── services/        # Azure SDK wrappers
├── tools/           # MCP tool implementations
├── types/           # TypeScript type definitions
└── utils/           # Utility functions

tests/               # Test files (mirror src structure)
docs/               # Documentation
examples/           # Example usage
```

## 🧪 Testing Guidelines

### Test Categories

1. **Unit Tests**: Test individual functions/classes
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete workflows

### Writing Good Tests

```typescript
describe('AzureClientManager', () => {
  describe('createResourceGroup', () => {
    it('should create resource group with valid parameters', async () => {
      // Arrange
      const client = new AzureClientManager(validConfig);
      const resourceGroupName = 'test-rg';
      
      // Act
      const result = await client.createResourceGroup(resourceGroupName, 'eastus');
      
      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(resourceGroupName);
    });
  });
});
```

### Mocking Guidelines

- Mock external dependencies (Azure SDK)
- Use realistic mock data
- Test both success and failure scenarios
- Mock network calls and authentication

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for public APIs
- Include parameter and return type descriptions
- Provide usage examples

```typescript
/**
 * Creates a new Azure resource group
 * @param name - The name of the resource group
 * @param region - The Azure region (e.g., 'eastus', 'westus2')
 * @param tags - Optional tags to apply to the resource group
 * @returns Promise<ResourceGroup> The created resource group
 * @throws {Error} When resource group creation fails
 * @example
 * ```typescript
 * const rg = await client.createResourceGroup('my-rg', 'eastus', { env: 'dev' });
 * ```
 */
async createResourceGroup(name: string, region: string, tags?: Record<string, string>): Promise<ResourceGroup>
```

### README Updates

When adding new features, update:
- Installation instructions (if dependencies change)
- Configuration options (if new env vars added)
- Usage examples (if new tools/methods added)
- Troubleshooting section (if new issues identified)

## 🐛 Bug Reports

Use GitHub Issues with the bug report template:

**Required Information:**
- Node.js version (`node --version`)
- npm version (`npm --version`)
- Operating System
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs/error messages

## 💡 Feature Requests

For new features:
1. Check existing issues/discussions
2. Describe the use case
3. Propose implementation approach
4. Consider backward compatibility
5. Discuss breaking changes

## 🔒 Security

### Security Issues

**DO NOT** open GitHub issues for security vulnerabilities. Instead:
- Email: security@mcp-azure.com (if available)
- Use GitHub's security advisory feature
- Provide detailed reproduction steps

### Secrets Management

- Never commit secrets/credentials
- Use `.env.example` for examples
- Sanitize logs of sensitive data
- Follow Azure security best practices

## 📞 Getting Help

- **Documentation**: Check README.md and docs/
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Tests**: Look at existing test files for examples

## 🎯 Good First Issues

Look for issues labeled:
- `good first issue`
- `help wanted`
- `documentation`
- `tests needed`

## ✅ Review Process

### Code Review Criteria

- **Functionality**: Does the code work as intended?
- **Tests**: Are there adequate tests?
- **Style**: Does it follow project conventions?
- **Performance**: Are there any performance concerns?
- **Security**: Are there any security implications?
- **Documentation**: Is documentation updated?

### Reviewer Guidelines

- Be constructive and respectful
- Explain the "why" behind suggestions
- Approve when ready, request changes when needed
- Test the changes if possible

Thank you for contributing to MCP Azure Deployment Service! 🚀