#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Health check script to verify installation and setup
 */

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

class HealthChecker {
  private checks: HealthCheck[] = [];

  public async runAll(): Promise<boolean> {
    console.log('🏥 Running MCP Azure Deployment Service Health Check\\n');

    await this.checkNodeVersion();
    await this.checkNpmVersion();
    await this.checkDependencies();
    await this.checkTypeScript();
    await this.checkEnvironmentFiles();
    await this.checkBuildSystem();
    await this.checkTests();
    
    this.printResults();
    return this.isHealthy();
  }

  private async checkNodeVersion(): Promise<void> {
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        this.addCheck('Node.js Version', 'pass', `Node.js ${nodeVersion} ✅`);
      } else {
        this.addCheck('Node.js Version', 'fail', `Node.js ${nodeVersion} (requires >=18.0.0)`);
      }
    } catch (error) {
      this.addCheck('Node.js Version', 'fail', 'Unable to detect Node.js version');
    }
  }

  private async checkNpmVersion(): Promise<void> {
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(npmVersion.split('.')[0]);
      
      if (majorVersion >= 9) {
        this.addCheck('npm Version', 'pass', `npm ${npmVersion} ✅`);
      } else {
        this.addCheck('npm Version', 'warn', `npm ${npmVersion} (recommended >=9.0.0)`);
      }
    } catch (error) {
      this.addCheck('npm Version', 'fail', 'npm not found or not accessible');
    }
  }

  private async checkDependencies(): Promise<void> {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const nodeModulesPath = join(process.cwd(), 'node_modules');
      const packageLockPath = join(process.cwd(), 'package-lock.json');

      if (!existsSync(packageJsonPath)) {
        this.addCheck('Dependencies', 'fail', 'package.json not found');
        return;
      }

      if (!existsSync(nodeModulesPath)) {
        this.addCheck('Dependencies', 'fail', 'node_modules not found. Run: npm install');
        return;
      }

      if (!existsSync(packageLockPath)) {
        this.addCheck('Dependencies', 'warn', 'package-lock.json not found');
      } else {
        this.addCheck('Dependencies', 'pass', 'Dependencies installed ✅');
      }

      // Check for key dependencies
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const requiredDeps = ['@azure/identity', '@azure/arm-compute', '@azure/arm-resources', 'winston', 'joi'];
      const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);

      if (missingDeps.length > 0) {
        this.addCheck('Key Dependencies', 'fail', `Missing: ${missingDeps.join(', ')}`);
      } else {
        this.addCheck('Key Dependencies', 'pass', 'All key dependencies present ✅');
      }

    } catch (error) {
      this.addCheck('Dependencies', 'fail', `Error checking dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkTypeScript(): Promise<void> {
    try {
      const tsconfigPath = join(process.cwd(), 'tsconfig.json');
      
      if (!existsSync(tsconfigPath)) {
        this.addCheck('TypeScript Config', 'fail', 'tsconfig.json not found');
        return;
      }

      // Try to run TypeScript compiler
      execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
      this.addCheck('TypeScript', 'pass', 'TypeScript compilation successful ✅');
    } catch (error) {
      this.addCheck('TypeScript', 'fail', 'TypeScript compilation failed', 
        'Run: npm run typecheck for details');
    }
  }

  private async checkEnvironmentFiles(): Promise<void> {
    const envPath = join(process.cwd(), '.env');
    const envExamplePath = join(process.cwd(), '.env.example');

    if (!existsSync(envExamplePath)) {
      this.addCheck('Environment Template', 'fail', '.env.example not found');
    } else {
      this.addCheck('Environment Template', 'pass', '.env.example found ✅');
    }

    if (!existsSync(envPath)) {
      this.addCheck('Environment Config', 'warn', '.env not found', 
        'Copy .env.example to .env and configure it');
    } else {
      this.addCheck('Environment Config', 'pass', '.env file found ✅');
    }
  }

  private async checkBuildSystem(): Promise<void> {
    try {
      const distPath = join(process.cwd(), 'dist');
      
      // Try to build
      execSync('npm run build', { stdio: 'pipe' });
      
      if (existsSync(distPath)) {
        this.addCheck('Build System', 'pass', 'Build successful ✅');
      } else {
        this.addCheck('Build System', 'fail', 'Build completed but dist folder not found');
      }
    } catch (error) {
      this.addCheck('Build System', 'fail', 'Build failed', 
        'Run: npm run build for details');
    }
  }

  private async checkTests(): Promise<void> {
    try {
      const testOutput = execSync('npm test -- --passWithNoTests', { encoding: 'utf8' });
      
      if (testOutput.includes('Tests:') && !testOutput.includes('failed')) {
        this.addCheck('Test Suite', 'pass', 'Tests passing ✅');
      } else {
        this.addCheck('Test Suite', 'warn', 'Some tests may be failing');
      }
    } catch (error) {
      this.addCheck('Test Suite', 'fail', 'Test execution failed', 
        'Run: npm test for details');
    }
  }

  private addCheck(name: string, status: 'pass' | 'fail' | 'warn', message: string, details?: string): void {
    this.checks.push({ name, status, message, details });
  }

  private isHealthy(): boolean {
    return !this.checks.some(check => check.status === 'fail');
  }

  private printResults(): void {
    console.log('\\n' + '='.repeat(60));
    console.log('🏥 HEALTH CHECK RESULTS');
    console.log('='.repeat(60));

    this.checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name.padEnd(25)} ${check.message}`);
      if (check.details) {
        console.log(`   ${''.padEnd(25)} → ${check.details}`);
      }
    });

    const passCount = this.checks.filter(c => c.status === 'pass').length;
    const warnCount = this.checks.filter(c => c.status === 'warn').length;
    const failCount = this.checks.filter(c => c.status === 'fail').length;

    console.log('\\n' + '='.repeat(60));
    console.log(`📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);

    if (this.isHealthy()) {
      console.log('🎉 Health check PASSED! System is ready to use.');
      console.log('\\n📚 Next steps:');
      console.log('   1. Configure credentials: npm run validate-config');
      console.log('   2. Test Azure connection: npm run test-credentials');
      console.log('   3. Try sample deployment: npm run sample-deploy');
    } else {
      console.log('❌ Health check FAILED! Please fix the issues above.');
      console.log('\\n🔧 Common fixes:');
      console.log('   • Install dependencies: npm install');
      console.log('   • Set up environment: cp .env.example .env');
      console.log('   • Update Node.js: https://nodejs.org/');
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthChecker();
  checker.runAll()
    .then(isHealthy => {
      process.exit(isHealthy ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    });
}

export { HealthChecker };