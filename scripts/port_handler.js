/**
 * 포트 충돌 자동 처리 스크립트
 * 지정된 포트가 사용 중이면 다음 사용 가능한 포트를 자동으로 찾습니다.
 */

const net = require('net');
const { execSync } = require('child_process');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(false));
    });
    server.on('error', () => {
      resolve(true); // 포트가 사용 중
    });
  });
}

function findAvailablePort(startPort, maxAttempts = 10) {
  return new Promise(async (resolve) => {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      const isOccupied = await checkPort(port);
      
      if (!isOccupied) {
        resolve(port);
        return;
      }
    }
    
    throw new Error(`사용 가능한 포트를 ${maxAttempts}개 시도 후 찾을 수 없습니다.`);
  });
}

function killProcessOnPort(port) {
  try {
    // Windows에서는 netstat을 사용하고, Linux/macOS에서는 lsof를 사용
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
      const lines = result.trim().split('\n');
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1]; // PID는 마지막 열
          if (pid && !isNaN(pid)) {
            console.log(`PID ${pid}에서 실행 중인 프로세스를 종료합니다...`);
            execSync(`taskkill /PID ${pid} /F`);
            return true;
          }
        }
      }
    } else {
      // Unix-like systems
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' });
      const pids = result.trim().split('\n').filter(Boolean);
      
      for (const pid of pids) {
        if (pid) {
          console.log(`PID ${pid}에서 실행 중인 프로세스를 종료합니다...`);
          execSync(`kill -9 ${pid}`);
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    // 포트에 연결된 프로세스가 없을 수 있으므로 무시
    return false;
  }
}

async function handlePort(port) {
  const isOccupied = await checkPort(port);
  
  if (isOccupied) {
    console.log(`⚠️  포트 ${port}가 이미 사용 중입니다.`);
    
    // 사용자에게 포트 종료 여부 물어보기
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(`포트 ${port}에서 실행 중인 프로세스를 종료하시겠습니까? (y/n): `, (answer) => {
        rl.close();
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          const killed = killProcessOnPort(port);
          if (killed) {
            console.log(`✅ 포트 ${port}에서 프로세스를 종료했습니다.`);
            setTimeout(() => resolve(port), 1000); // 프로세스 종료 대기
          } else {
            console.log(`⚠️  포트 ${port}에서 실행 중인 프로세스를 찾지 못했습니다.`);
            findAvailablePort(port).then(resolve);
          }
        } else {
          console.log(`🔍 다음 사용 가능한 포트를 찾는 중...`);
          findAvailablePort(port).then(resolve);
        }
      });
    });
  } else {
    return port;
  }
}

module.exports = {
  checkPort,
  findAvailablePort,
  killProcessOnPort,
  handlePort
};

// CLI로 사용 시
if (require.main === module) {
  const port = parseInt(process.argv[2]) || 3000;
  
  handlePort(port).then((availablePort) => {
    console.log(`✅ 사용 가능한 포트: ${availablePort}`);
    process.exit(0);
  }).catch((error) => {
    console.error(`❌ 오류: ${error.message}`);
    process.exit(1);
  });
}