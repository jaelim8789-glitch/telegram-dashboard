import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { securityLogger } from '../logging/securityLogger';

export interface Vulnerability {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  module: string;
  version: string;
  vulnerable_versions: string;
  patched_versions: string;
  overview: string;
  recommendation: string;
}

export interface DependencyAuditResult {
  vulnerabilities: Vulnerability[];
  directDependencies: string[];
  transitiveDependencies: string[];
  outdatedPackages: Array<{
    name: string;
    current: string;
    latest: string;
  }>;
  auditDate: Date;
}

export class DependencyAuditor {
  private packageJsonPath: string;
  private auditResults: DependencyAuditResult | null = null;

  constructor(packageJsonPath: string = './package.json') {
    this.packageJsonPath = packageJsonPath;
  }

  // 패키지 의존성 분석
  async analyzeDependencies(): Promise<DependencyAuditResult> {
    const result: DependencyAuditResult = {
      vulnerabilities: [],
      directDependencies: [],
      transitiveDependencies: [],
      outdatedPackages: [],
      auditDate: new Date()
    };

    // package.json에서 직접 의존성 추출
    if (fs.existsSync(this.packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf-8'));
      result.directDependencies = Object.keys(packageJson.dependencies || {});
      
      // devDependencies도 포함
      const devDeps = Object.keys(packageJson.devDependencies || {});
      result.directDependencies = [...result.directDependencies, ...devDeps];
    }

    // 취약점 스캔 실행 (npm audit 또는 유사 도구)
    try {
      const vulnerabilities = await this.runVulnerabilityScan();
      result.vulnerabilities = vulnerabilities;
    } catch (error) {
      securityLogger.error('Failed to run vulnerability scan', { error: (error as Error).message });
    }

    // 오래된 패키지 확인
    try {
      const outdated = await this.checkOutdatedPackages();
      result.outdatedPackages = outdated;
    } catch (error) {
      securityLogger.error('Failed to check outdated packages', { error: (error as Error).message });
    }

    this.auditResults = result;
    return result;
  }

  // 취약점 스캔 실행
  private async runVulnerabilityScan(): Promise<Vulnerability[]> {
    return new Promise((resolve, reject) => {
      // 실제 npm audit 명령어 실행
      const auditProcess = spawn('npm', ['audit', '--json'], { cwd: path.dirname(this.packageJsonPath) });

      let stdout = '';
      let stderr = '';

      auditProcess.stdout.on('data', (data) => {
        stdout += data;
      });

      auditProcess.stderr.on('data', (data) => {
        stderr += data;
      });

      auditProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const auditResult = JSON.parse(stdout);
            
            if (auditResult.vulnerabilities) {
              const vulnerabilities: Vulnerability[] = [];
              
              // 취약점 데이터를 표준 형식으로 변환
              for (const [id, vuln] of Object.entries(auditResult.vulnerabilities)) {
                if ((vuln as any).severity) {
                  vulnerabilities.push({
                    id: id as string,
                    title: (vuln as any).title || 'Unknown vulnerability',
                    severity: (vuln as any).severity || 'low',
                    module: (vuln as any).module_name || 'unknown',
                    version: (vuln as any)..version || 'unknown',
                    vulnerable_versions: (vuln as any).vulnerable_versions || 'all',
                    patched_versions: (vuln as any).patched_versions || 'none',
                    overview: (vuln as any).overview || 'No overview available',
                    recommendation: (vuln as any).recommendation || 'Update package'
                  });
                }
              }
              
              resolve(vulnerabilities);
            } else {
              resolve([]);
            }
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          if (stderr.includes('found 0 vulnerabilities')) {
            resolve([]);
          } else {
            reject(new Error(stderr || `Audit process exited with code ${code}`));
          }
        }
      });
    });
  }

  // 오래된 패키지 확인
  private async checkOutdatedPackages(): Promise<Array<{ name: string; current: string; latest: string }>> {
    return new Promise((resolve, reject) => {
      const outdatedProcess = spawn('npm', ['outdated', '--json'], { cwd: path.dirname(this.packageJsonPath) });

      let stdout = '';
      let stderr = '';

      outdatedProcess.stdout.on('data', (data) => {
        stdout += data;
      });

      outdatedProcess.stderr.on('data', (data) => {
        stderr += data;
      });

      outdatedProcess.on('close', (code) => {
        if (code === 0 || code === 1) { // 1은 outdated 패키지가 있을 때의 코드
          try {
            const outdatedResult = JSON.parse(stdout);
            const outdatedPackages: Array<{ name: string; current: string; latest: string }> = [];

            for (const [name, pkg] of Object.entries(outdatedResult)) {
              const packageInfo = pkg as any;
              outdatedPackages.push({
                name,
                current: packageInfo.current,
                latest: packageInfo.latest
              });
            }

            resolve(outdatedPackages);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(stderr || `Outdated check process exited with code ${code}`));
        }
      });
    });
  }

  // 보고서 생성
  generateReport(): string {
    if (!this.auditResults) {
      throw new Error('No audit results available. Run analyzeDependencies first.');
    }

    let report = `Dependency Security Audit Report\n`;
    report += `Generated: ${this.auditResults.auditDate.toISOString()}\n\n`;

    report += `Direct Dependencies: ${this.auditResults.directDependencies.length}\n`;
    report += `Transitive Dependencies: ${this.auditResults.transitiveDependencies.length}\n\n`;

    // 취약점 요약
    const severityCounts = this.auditResults.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    report += `Vulnerabilities Found:\n`;
    for (const [severity, count] of Object.entries(severityCounts)) {
      report += `- ${severity.toUpperCase()}: ${count}\n`;
    }
    report += `\n`;

    // 상세 취약점 목록
    if (this.auditResults.vulnerabilities.length > 0) {
      report += `Detailed Vulnerabilities:\n`;
      for (const vuln of this.auditResults.vulnerabilities) {
        report += `- ${vuln.title} (${vuln.severity.toUpperCase()}) in ${vuln.module}@${vuln.version}\n`;
        report += `  Recommended: ${vuln.recommendation}\n\n`;
      }
    } else {
      report += `No vulnerabilities found!\n\n`;
    }

    // 오래된 패키지 목록
    if (this.auditResults.outdatedPackages.length > 0) {
      report += `Outdated Packages:\n`;
      for (const pkg of this.auditResults.outdatedPackages) {
        report += `- ${pkg.name}: ${pkg.current} -> ${pkg.latest}\n`;
      }
      report += `\n`;
    }

    return report;
  }

  // 위험도 기반 필터링
  filterVulnerabilitiesBySeverity(severities: ('critical' | 'high' | 'moderate' | 'low')[]): Vulnerability[] {
    if (!this.auditResults) {
      return [];
    }

    return this.auditResults.vulnerabilities.filter(vuln => 
      severities.includes(vuln.severity)
    );
  }

  // 패키지별 취약점 조회
  getVulnerabilitiesByPackage(packageName: string): Vulnerability[] {
    if (!this.auditResults) {
      return [];
    }

    return this.auditResults.vulnerabilities.filter(vuln => 
      vuln.module === packageName
    );
  }

  // 보안 권고 실행
  async applySecurityRecommendations(): Promise<void> {
    if (!this.auditResults) {
      throw new Error('No audit results available. Run analyzeDependencies first.');
    }

    // 우선순위에 따라 권고 적용
    const criticalVulns = this.filterVulnerabilitiesBySeverity(['critical', 'high']);
    
    for (const vuln of criticalVulns) {
      securityLogger.security(`Applying security recommendation for ${vuln.module}`, {
        vulnerability: vuln.id,
        severity: vuln.severity,
        recommendation: vuln.recommendation
      });

      // 패키지 업데이트 실행
      await this.updatePackage(vuln.module, vuln.patched_versions);
    }
  }

  // 패키지 업데이트
  private async updatePackage(packageName: string, targetVersion: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const updateProcess = spawn('npm', ['install', `${packageName}@${targetVersion}`], { 
        cwd: path.dirname(this.packageJsonPath) 
      });

      updateProcess.on('close', (code) => {
        if (code === 0) {
          securityLogger.info(`Successfully updated ${packageName} to ${targetVersion}`);
          resolve();
        } else {
          securityLogger.error(`Failed to update ${packageName} to ${targetVersion}`);
          reject(new Error(`Update process exited with code ${code}`));
        }
      });
    });
  }

  // 정기 감사 스케줄러
  scheduleRegularAudits(intervalHours: number = 24): void {
    setInterval(async () => {
      try {
        securityLogger.info('Starting scheduled dependency audit');
        const results = await this.analyzeDependencies();
        const report = this.generateReport();
        
        // 보고서 저장
        const reportPath = `./reports/dependency-audit-${new Date().toISOString().split('T')[0]}.txt`;
        fs.writeFileSync(reportPath, report);
        
        // 중요 취약점이 있는 경우 알림
        const criticalVulns = this.filterVulnerabilitiesBySeverity(['critical', 'high']);
        if (criticalVulns.length > 0) {
          securityLogger.security('Critical vulnerabilities detected in scheduled audit', {
            count: criticalVulns.length,
            reportPath
          });
        }
      } catch (error) {
        securityLogger.error('Scheduled dependency audit failed', { error: (error as Error).message });
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}

// 전역 의존성 감사 인스턴스
export const dependencyAuditor = new DependencyAuditor('./package.json');

// 감사 스케줄러 시작
dependencyAuditor.scheduleRegularAudits(24); // 24시간마다 감사