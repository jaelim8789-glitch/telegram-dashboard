const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);
    
    socket.on('connect', () => {
      console.log(`Port ${port} is in use`);
      socket.destroy();
      
      // Try to kill the process using the port
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
          if (stdout) {
            const lines = stdout.split('\r\n').filter(line => line.trim());
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 5) {
                const pid = parts[4]; // PID is the 5th column
                console.log(`Killing process ${pid} using port ${port}`);
                exec(`taskkill /PID ${pid} /F`, (killError) => {
                  if (killError) {
                    console.log(`Failed to kill process ${pid}: ${killError.message}`);
                  } else {
                    console.log(`Successfully killed process ${pid}`);
                  }
                  resolve(true);
                });
              }
            }
          } else {
            resolve(false);
          }
        });
      } else {
        // For Unix-like systems
        const { exec } = require('child_process');
        exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}'`, (error, pid) => {
          if (pid && pid.trim()) {
            console.log(`Killing process ${pid.trim()} using port ${port}`);
            exec(`kill -9 ${pid.trim()}`, (killError) => {
              if (killError) {
                console.log(`Failed to kill process ${pid.trim()}: ${killError.message}`);
              } else {
                console.log(`Successfully killed process ${pid.trim()}`);
              }
              resolve(true);
            });
          } else {
            resolve(false);
          }
        });
      }
    });

    socket.on('timeout', () => {
      console.log(`Port ${port} is not in use (connection timeout)`);
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(`Port ${port} is not in use (connection refused)`);
        resolve(false);
      } else {
        console.log(`Error checking port ${port}: ${err.message}`);
        resolve(false);
      }
    });

    socket.connect(port, 'localhost');
  });
}

async function main() {
  console.log('Checking if port 3000 is in use...');
  const wasInUse = await checkPort(3000);
  
  if (!wasInUse) {
    console.log('Port 3000 is free');
  }
  
  process.exit(0);
}

main().catch(console.error);