/**
 * Capacitor 앱스토어 빌드 파이프라인 스크립트
 * iOS/Android 앱 빌드 자동화
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 빌드 설정
const BUILD_CONFIG = {
  ios: {
    platform: 'ios',
    projectPath: './ios/App',
    archivePath: './build/ios-archive',
    outputPath: './build/ios-app',
  },
  android: {
    platform: 'android',
    projectPath: './android',
    outputPath: './build/android-apk',
  }
};

// 빌드 전 준비 작업
function prepareBuild(platform) {
  console.log(`🔧 ${platform.toUpperCase()} 플랫폼 빌드 준비 중...`);
  
  try {
    // Capacitor sync 실행
    console.log('🔄 Capacitor 프로젝트 동기화 중...');
    execSync('npx cap sync', { stdio: 'inherit' });
    
    // 빌드 디렉토리 생성
    const buildDir = './build';
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    console.log(`✅ ${platform.toUpperCase()} 준비 완료`);
  } catch (error) {
    console.error(`❌ ${platform.toUpperCase()} 준비 실패:`, error.message);
    throw error;
  }
}

// iOS 빌드
function buildIOS() {
  const config = BUILD_CONFIG.ios;
  
  try {
    prepareBuild(config.platform);
    
    console.log('📱 iOS 앱 빌드 시작...');
    
    // Xcode 프로젝트 빌드
    execSync(`cd ${config.projectPath} && xcodebuild -workspace App.xcworkspace -scheme App archive -archivePath ${config.archivePath}`, { stdio: 'inherit' });
    
    // 앱스토어 배포를 위한 업로드
    console.log('📤 iOS 앱 아카이브 생성 완료');
    
    // TestFlight로 업로드 (선택 사항)
    if (process.env.UPLOAD_TO_TESTFLIGHT === 'true') {
      console.log('🚀 TestFlight로 업로드 중...');
      execSync(`xcrun altool --upload-app -t ios -f ${config.archivePath}.xcarchive -u ${process.env.APPLE_ID} -p ${process.env.APP_PASSWORD}`, { stdio: 'inherit' });
    }
    
    console.log('✅ iOS 빌드 완료');
  } catch (error) {
    console.error('❌ iOS 빌드 실패:', error.message);
    throw error;
  }
}

// Android 빌드
function buildAndroid() {
  const config = BUILD_CONFIG.android;
  
  try {
    prepareBuild(config.platform);
    
    console.log('🤖 Android 앱 빌드 시작...');
    
    // Android APK 빌드
    execSync(`cd ${config.projectPath} && ./gradlew assembleRelease`, { stdio: 'inherit' });
    
    // APK 파일 복사
    const apkSource = path.join(config.projectPath, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    const apkDest = path.join(config.outputPath, 'telemon-android.apk');
    
    if (!fs.existsSync(config.outputPath)) {
      fs.mkdirSync(config.outputPath, { recursive: true });
    }
    
    fs.copyFileSync(apkSource, apkDest);
    console.log(`✅ Android APK 생성: ${apkDest}`);
    
    // Google Play Console로 업로드 (선택 사항)
    if (process.env.UPLOAD_TO_PLAYSTORE === 'true') {
      console.log('🚀 Google Play Console로 업로드 중...');
      // Google Play Console API를 사용한 업로드 로직 필요
    }
    
    console.log('✅ Android 빌드 완료');
  } catch (error) {
    console.error('❌ Android 빌드 실패:', error.message);
    throw error;
  }
}

// 전체 빌드 실행
function buildAll() {
  console.log('🚀 전체 앱 빌드 시작 (iOS & Android)');
  
  try {
    const platforms = process.argv.slice(2); // 명령줄 인자에서 플랫폼 결정
    
    if (platforms.length === 0 || platforms.includes('ios')) {
      buildIOS();
    }
    
    if (platforms.length === 0 || platforms.includes('android')) {
      buildAndroid();
    }
    
    console.log('🎉 모든 앱 빌드 완료!');
  } catch (error) {
    console.error('❌ 빌드 실패:', error.message);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  buildAll();
}

module.exports = {
  buildIOS,
  buildAndroid,
  buildAll,
  prepareBuild
};