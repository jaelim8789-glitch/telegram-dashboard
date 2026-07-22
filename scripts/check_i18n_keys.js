/**
 * i18n 키 완결성 체크 스크립트
 * 다국어 지원 중인데 번역 누락된 키를 자동 감지합니다.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// i18n 파일 경로
const I18N_PATH = path.join(__dirname, '..', 'src', 'messages');

/**
 * 모든 언어 파일을 읽습니다.
 */
function readLanguageFiles() {
  const files = {};
  
  if (!fs.existsSync(I18N_PATH)) {
    console.log(`i18n 디렉토리가 존재하지 않습니다: ${I18N_PATH}`);
    return files;
  }
  
  const langs = fs.readdirSync(I18N_PATH).filter(file => 
    file.endsWith('.json') && file !== 'index.js'
  );
  
  for (const lang of langs) {
    const filePath = path.join(I18N_PATH, lang);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      files[lang.replace('.json', '')] = JSON.parse(content);
    } catch (error) {
      console.error(`파일 읽기 오류 ${filePath}:`, error.message);
    }
  }
  
  return files;
}

/**
 * 소스 코드에서 사용되는 i18n 키를 추출합니다.
 */
function extractUsedKeys() {
  const keys = new Set();
  
  // src 디렉토리 내의 모든 JS/TS/JSX/TSX 파일 검색
  const files = glob.sync(path.join(__dirname, '..', 'src', '**', '*.{js,ts,jsx,tsx}'));
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    // t('key') 또는 t("key") 패턴 검색
    const regex = /t\s*\(\s*["'](.*?)["']\s*\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      keys.add(match[1]);
    }
    
    // {{t('key')}} 또는 {{t("key")}} 패턴 검색
    const templateRegex = /\{\{\s*t\s*\(\s*["'](.*?)["']\s*\)\s*\}\}/g;
    let templateMatch;
    while ((templateMatch = templateRegex.exec(content)) !== null) {
      keys.add(templateMatch[1]);
    }
    
    // useTranslations 훅 사용 패턴 검색
    const useTransRegex = /\.t\s*\(\s*["'](.*?)["']\s*\)/g;
    let transMatch;
    while ((transMatch = useTransRegex.exec(content)) !== null) {
      keys.add(transMatch[1]);
    }
  }
  
  return Array.from(keys);
}

/**
 * 중첩된 객체에서 모든 키를 추출합니다.
 */
function extractAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * 누락된 키를 확인합니다.
 */
function checkMissingKeys(languageFiles, usedKeys) {
  const results = {};
  
  for (const [lang, translations] of Object.entries(languageFiles)) {
    const allKeys = extractAllKeys(translations);
    const missingKeys = usedKeys.filter(key => !allKeys.includes(key));
    const extraKeys = allKeys.filter(key => !usedKeys.includes(key));
    
    results[lang] = {
      missing: missingKeys,
      extra: extraKeys,
      totalUsed: usedKeys.length,
      totalTranslated: allKeys.length,
      coverage: allKeys.length > 0 ? ((usedKeys.length - missingKeys.length) / usedKeys.length * 100).toFixed(2) : 0
    };
  }
  
  return results;
}

/**
 * 결과를 출력합니다.
 */
function printResults(results) {
  let hasIssues = false;
  
  console.log('\n🌐 i18n 키 완결성 체크 결과:');
  console.log('='.repeat(60));
  
  for (const [lang, result] of Object.entries(results)) {
    console.log(`\n🔍 ${lang.toUpperCase()} 언어 파일 분석 결과:`);
    console.log(`  사용된 키: ${result.totalUsed}, 번역된 키: ${result.totalTranslated - result.extra.length}`);
    console.log(`  번역 커버리지: ${result.coverage}%`);
    
    if (result.missing.length > 0) {
      console.log(`  ❌ 누락된 키 (${result.missing.length}개):`);
      for (const key of result.missing.slice(0, 10)) { // 상위 10개만 표시
        console.log(`    - ${key}`);
      }
      if (result.missing.length > 10) {
        console.log(`    ... 외 ${result.missing.length - 10}개`);
      }
      hasIssues = true;
    } else {
      console.log('  ✅ 모든 사용된 키가 번역되어 있습니다.');
    }
    
    if (result.extra.length > 0) {
      console.log(`  ⚠️  미사용 번역 키 (${result.extra.length}개):`);
      for (const key of result.extra.slice(0, 10)) { // 상위 10개만 표시
        console.log(`    - ${key}`);
      }
      if (result.extra.length > 10) {
        console.log(`    ... 외 ${result.extra.length - 10}개`);
      }
    }
  }
  
  return hasIssues;
}

/**
 * JSON 형식의 리포트를 생성합니다.
 */
function generateJsonReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {},
    details: results
  };
  
  for (const [lang, result] of Object.entries(results)) {
    report.summary[lang] = {
      totalUsedKeys: result.totalUsed,
      translatedKeys: result.totalTranslated - result.extra.length,
      missingKeys: result.missing.length,
      extraKeys: result.extra.length,
      coveragePercentage: parseFloat(result.coverage)
    };
  }
  
  return report;
}

/**
 * 리포트를 파일로 저장합니다.
 */
function saveReport(report) {
  const reportPath = path.join(__dirname, '..', 'i18n_coverage_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 상세 리포트가 ${reportPath}에 저장되었습니다.`);
}

/**
 * 메인 함수
 */
function main() {
  console.log('🌐 i18n 키 완결성 체크를 시작합니다...');
  
  const languageFiles = readLanguageFiles();
  if (Object.keys(languageFiles).length === 0) {
    console.log('⚠️  언어 파일이 없습니다. i18n 기능을 사용하지 않는 프로젝트일 수 있습니다.');
    return 0;
  }
  
  const usedKeys = extractUsedKeys();
  console.log(`✅ 소스 코드에서 ${usedKeys.length}개의 i18n 키를 발견했습니다.`);
  
  const results = checkMissingKeys(languageFiles, usedKeys);
  const hasIssues = printResults(results);
  
  // JSON 리포트 생성 및 저장
  const report = generateJsonReport(results);
  saveReport(report);
  
  if (hasIssues) {
    console.log('\n❌ 누락된 번역 키가 있습니다. i18n 파일을 업데이트해주세요.');
    return 1;
  } else {
    console.log('\n✅ 모든 i18n 키가 완전히 번역되어 있습니다.');
    return 0;
  }
}

// CLI로 실행 시
if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

module.exports = {
  readLanguageFiles,
  extractUsedKeys,
  extractAllKeys,
  checkMissingKeys,
  printResults,
  generateJsonReport,
  saveReport,
  main
};