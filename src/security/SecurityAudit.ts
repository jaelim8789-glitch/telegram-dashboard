import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
import { securityLogger } from '../logging/securityLogger';
import { dependencyAuditor } from './DependencyAuditor';
import { DataIntegrityValidator } from '../validators/dataIntegrity';
import { logSecurityManager } from '../logging\LogSecurity';
import { resourceProtection } from './ResourceProtection';

export interface SecurityAuditFinding {
  id: string;
  category: 'vulnerability' | 'misconfiguration' | 'best-practice' | 'policy-violation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location?: string;
  remediation: string;
  detectedAt: Date;
  status: 'open' | 'in-progress' | 'resolved' | 'ignored';
}

export interface SecurityAuditConfig {
  runAutomatedScans: boolean;
  scanFrequency: 'hourly' | 'daily' | 'weekly';
  vulnerabilityScan: boolean;
  codeScan: boolean;
  configurationAudit: boolean;
  complianceCheck: boolean;
  notificationEnabled: boolean;
  reportRecipients: string[];
}

export interface AuditReport {
  id: string;
  generatedAt: Date;
  findings: SecurityAuditFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  config: SecurityAuditConfig;
}

export class SecurityAuditor {
  private config: SecurityAuditConfig;
  private findings: SecurityAuditFinding[] = [];
  private auditReports: AuditReport[] = [];
  private scanInProgress: boolean = false;

  constructor(config?: Partial<SecurityAuditConfig>) {
    this.config = {
      runAutomatedScans: config?.runAutomatedScans ?? true,
      scanFrequency: config?.scanFrequency ?? 'daily',
      vulnerabilityScan: config?.vulnerabilityScan ?? true,
      codeScan: config?.codeScan ?? true,
      configurationAudit: config?.configurationAudit ?? true,
      complianceCheck: config?.complianceCheck ?? true,
      notificationEnabled: config?.notificationEnabled ?? true,
      reportRecipients: config?.reportRecipients ?? ['admin@example.com'],
      ...config
    };
  }

  // 보안 감사 실행
  async runSecurityAudit(): Promise<AuditReport> {
    if (this.scanInProgress) {
      throw new Error('Security scan is already in progress');
    }

    this.scanInProgress = true;
    const startTime = Date.now();

    try {
      securityLogger.info('Starting security audit');

      // 감사 ID 생성
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 다양한 감사 유형 실행
      const findings: SecurityAuditFinding[] = [];

      if (this.config.vulnerabilityScan) {
        findings.push(...await this.runVulnerabilityScan());
      }

      if (this.config.codeScan) {
        findings.push(...await this.runCodeScan());
      }

      if (this.config.configurationAudit) {
        findings.push(...await this.runConfigurationAudit());
      }

      if (this.config.complianceCheck) {
        findings.push(...await this.runComplianceCheck());
      }

      // 감사 결과 요약
      const summary = this.summarizeFindings(findings);

      // 감사 보고서 생성
      const report: AuditReport = {
        id: auditId,
        generatedAt: new Date(),
        findings,
        summary,
        config: { ...this.config }
      };

      // 보고서 저장
      this.auditReports.push(report);
      this.findings = [...findings]; // 최신 발견 사항 저장

      // 보고서 파일로 저장
      this.saveAuditReport(report);

      // 결과 로깅
      securityLogger.security('Security audit completed', {
        auditId,
        duration: Date.now() - startTime,
        findingsCount: findings.length,
        summary
      });

      // 중요 발견 사항에 대한 알림
      this.sendNotifications(report);

      return report;
    } finally {
      this.scanInProgress = false;
    }
  }

  // 취약점 스캔
  private async runVulnerabilityScan(): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];

    try {
      // 의존성 취약점 스캔
      const depResults = await dependencyAuditor.analyzeDependencies();
      
      for (const vuln of depResults.vulnerabilities) {
        findings.push({
          id: `vuln-${vuln.id}`,
          category: 'vulnerability',
          severity: vuln.severity,
          title: vuln.title,
          description: vuln.overview,
          location: `dependency: ${vuln.module}@${vuln.version}`,
          remediation: vuln.recommendation,
          detectedAt: new Date(),
          status: 'open'
        });
      }
    } catch (error) {
      securityLogger.error('Dependency vulnerability scan failed', { error: (error as Error).message });
    }

    return findings;
  }

  // 코드 스캔
  private async runCodeScan(): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];
    
    try {
      // 소스 코드에서 보안 취약점 스캔 (간단한 정적 분석)
      const codeIssues = await this.scanSourceCode();
      
      for (const issue of codeIssues) {
        findings.push({
          id: `code-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: 'vulnerability',
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          location: issue.location,
          remediation: issue.remediation,
          detectedAt: new Date(),
          status: 'open'
        });
      }
    } catch (error) {
      securityLogger.error('Code scan failed', { error: (error as Error).message });
    }

    return findings;
  }

  // 설정 감사
  private async runConfigurationAudit(): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];

    // 환경 변수 검사
    const envIssues = this.auditEnvironmentVariables();
    findings.push(...envIssues);

    // 보안 헤더 설정 검사
    const headerIssues = this.auditSecurityHeaders();
    findings.push(...headerIssues);

    // 세션 설정 검사
    const sessionIssues = this.auditSessionConfiguration();
    findings.push(...sessionIssues);

    return findings;
  }

  // 규정 준수 검사
  private async runComplianceCheck(): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];

    // 로깅 정책 검사
    const loggingIssues = this.checkLoggingCompliance();
    findings.push(...loggingIssues);

    // 데이터 보호 정책 검사
    const dataProtectionIssues = this.checkDataProtectionCompliance();
    findings.push(...dataProtectionIssues);

    return findings;
  }

  // 소스 코드 스캔 (간단한 정적 분석)
  private async scanSourceCode(): Promise<Array<{
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    location: string;
    remediation: string;
  }>> {
    const issues = [];
    
    // 프로젝트 루트에서 TypeScript 파일 검색
    const tsFiles = this.findFiles('./', ['.ts', '.tsx'], ['node_modules', 'dist', 'build']);
    
    for (const filePath of tsFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 일반적인 보안 취약점 패턴 검사
      if (content.includes('eval(') || content.includes('Function(')) {
        issues.push({
          title: 'Potential Code Injection',
          description: 'Use of eval() or Function() constructor detected, which can lead to code injection',
          severity: 'high',
          location: filePath,
          remediation: 'Replace eval() with safer alternatives like JSON.parse() for data parsing'
        });
      }
      
      if (content.includes('innerHTML') || content.includes('outerHTML')) {
        issues.push({
          title: 'DOM-based XSS Potential',
          description: 'Use of innerHTML or outerHTML detected, which can lead to DOM-based XSS',
          severity: 'medium',
          location: filePath,
          remediation: 'Use textContent or other safe methods to insert content'
        });
      }
      
      if (content.includes('location.href') || content.includes('window.open')) {
        issues.push({
          title: 'Open Redirect Potential',
          description: 'Potential open redirect vulnerability detected',
          severity: 'medium',
          location: filePath,
          remediation: 'Validate and sanitize URLs before using them in redirects'
        });
      }
    }
    
    return issues;
  }

  // 환경 변수 감사
  private auditEnvironmentVariables(): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    
    // 민감한 정보가 환경 변수에 적절히 설정되지 않았는지 확인
    const requiredEnvVars = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'TELEGRAM_API_KEY',
      'DATABASE_URL'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar] || process.env[envVar]?.length < 10) {
        findings.push({
          id: `config-env-${envVar}`,
          category: 'misconfiguration',
          severity: 'high',
          title: `Missing or weak ${envVar}`,
          description: `Environment variable ${envVar} is not properly configured`,
          remediation: `Set a strong, random value for ${envVar} in environment variables`,
          detectedAt: new Date(),
          status: 'open'
        });
      }
    }
    
    return findings;
  }

  // 보안 헤더 감사
  private auditSecurityHeaders(): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    
    // 보안 헤더가 적절히 설정되었는지 확인
    // 실제 구현에서는 미들웨어 설정 확인 로직 필요
    
    return findings;
  }

  // 세션 설정 감사
  private auditSessionConfiguration(): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    
    // 세션 설정 확인
    // 실제 구현에서는 세션 관리자 설정 확인 로직 필요
    
    return findings;
  }

  // 로깅 규정 준수 검사
  private checkLoggingCompliance(): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    
    // 민감 정보가 로그에 기록되지 않도록 설정되었는지 확인
    if (!logSecurityManager.getConfig().maskPasswords) {
      findings.push({
        id: 'compliance-logging-passwords',
        category: 'policy-violation',
        severity: 'high',
        title: 'Password masking disabled in logs',
        description: 'Passwords are not being masked in application logs',
        remediation: 'Enable password masking in logging configuration',
        detectedAt: new Date(),
        status: 'open'
      });
    }
    
    if (!logSecurityManager.getConfig().maskTokens) {
      findings.push({
        id: 'compliance-logging-tokens',
        category: 'policy-violation',
        severity: 'high',
        title: 'Token masking disabled in logs',
        description: 'Authentication tokens are not being masked in application logs',
        remediation: 'Enable token masking in logging configuration',
        detectedAt: new Date(),
        status: 'open'
      });
    }
    
    return findings;
  }

  // 데이터 보호 규정 준수 검사
  private checkDataProtectionCompliance(): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    
    // 데이터 암호화 설정 확인
    // 실제 구현에서는 암호화 설정 확인 로직 필요
    
    return findings;
  }

  // 파일 검색 유틸리티
  private findFiles(dir: string, extensions: string[], excludeDirs: string[] = []): string[] {
    const results: string[] = [];
    
    if (excludeDirs.some(excl => dir.includes(excl))) {
      return results;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        results.push(...this.findFiles(fullPath, extensions, excludeDirs));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        results.push(fullPath);
      }
    }
    
    return results;
  }

  // 감사 결과 요약
  private summarizeFindings(findings: SecurityAuditFinding[]): AuditReport['summary'] {
    const summary = {
      total: findings.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const finding of findings) {
      switch (finding.severity) {
        case 'critical':
          summary.critical++;
          break;
        case 'high':
          summary.high++;
          break;
        case 'medium':
          summary.medium++;
          break;
        case 'low':
          summary.low++;
          break;
      }
    }

    return summary;
  }

  // 감사 보고서 저장
  private saveAuditReport(report: AuditReport): void {
    const reportsDir = './reports/security-audits';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const fileName = path.join(reportsDir, `audit-report-${report.generatedAt.toISOString().split('T')[0]}.json`);
    fs.writeFileSync(fileName, JSON.stringify(report, null, 2));
  }

  // 알림 전송
  private sendNotifications(report: AuditReport): void {
    if (!this.config.notificationEnabled) {
      return;
    }

    // 중요 발견 사항이 있는 경우 알림
    if (report.summary.critical > 0 || report.summary.high > 0) {
      securityLogger.security('Security audit identified critical or high severity issues', {
        auditId: report.id,
        criticalIssues: report.summary.critical,
        highIssues: report.summary.high,
        reportPath: `./reports/security-audits/audit-report-${report.generatedAt.toISOString().split('T')[0]}.json`
      });

      // 실제 구현에서는 이메일 또는 다른 알림 시스템 사용
      console.log(`🚨 보안 감사에서 ${report.summary.critical}개의 심각한, ${report.summary.high}개의 높은 심각도 문제 발견`);
    }
  }

  // 주기적인 자동 감사 스케줄링
  scheduleAutomatedAudits(): void {
    let intervalMs: number;

    switch (this.config.scanFrequency) {
      case 'hourly':
        intervalMs = 60 * 60 * 1000;
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 24 * 60 * 60 * 1000;
    }

    setInterval(async () => {
      if (this.config.runAutomatedScans) {
        try {
          await this.runSecurityAudit();
        } catch (error) {
          securityLogger.error('Scheduled security audit failed', { error: (error as Error).message });
        }
      }
    }, intervalMs);
  }

  // 감사 설정 업데이트
  updateConfig(newConfig: Partial<SecurityAuditConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // 현재 설정 반환
  getConfig(): SecurityAuditConfig {
    return { ...this.config };
  }

  // 감사 결과 상태 업데이트
  updateFindingStatus(findingId: string, status: SecurityAuditFinding['status']): boolean {
    const finding = this.findings.find(f => f.id === findingId);
    if (finding) {
      finding.status = status;
      return true;
    }
    return false;
  }

  // 특정 범주 감사 결과 가져오기
  getFindingsByCategory(category: SecurityAuditFinding['category']): SecurityAuditFinding[] {
    return this.findings.filter(finding => finding.category === category);
  }

  // 특정 심각도 감사 결과 가져오기
  getFindingsBySeverity(severity: SecurityAuditFinding['severity']): SecurityAuditFinding[] {
    return this.findings.filter(finding => finding.severity === severity);
  }

  // 감사 결과 통계
  getAuditStats() {
    return {
      totalAudits: this.auditReports.length,
      totalFindings: this.findings.length,
      openFindings: this.findings.filter(f => f.status === 'open').length,
      resolvedFindings: this.findings.filter(f => f.status === 'resolved').length,
      lastAuditDate: this.auditReports.length > 0 
        ? this.auditReports[this.auditReports.length - 1].generatedAt 
        : null,
      isScanRunning: this.scanInProgress
    };
  }

  // 감사 결과 초기화
  clearAuditResults(): void {
    this.findings = [];
    this.auditReports = [];
  }
}

// 전역 보안 감사 인스턴스
export const securityAuditor = new SecurityAuditor({
  runAutomatedScans: true,
  scanFrequency: 'daily',
  vulnerabilityScan: true,
  codeScan: true,
  configurationAudit: true,
  complianceCheck: true,
  notificationEnabled: true,
  reportRecipients: ['security@telemon.com']
});

// 보안 감사 미들웨어
export function securityAuditMiddleware(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  // 요청에 대한 보안 감사 로깅
  securityLogger.logSecurityThreat('request-audited', req.connection.remoteAddress || 'unknown', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  next();
}

// 자동 감사 스케줄러 시작
securityAuditor.scheduleAutomatedAudits();