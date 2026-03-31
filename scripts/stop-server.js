const fs = require('fs');
const path = require('path');

const pidFile = path.join(__dirname, '..', '.server.pid');

if (!fs.existsSync(pidFile)) {
  console.log('No running server found.');
  process.exit(0);
}

const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
if (!pid) {
  fs.unlinkSync(pidFile);
  console.log('PID file was invalid and has been removed.');
  process.exit(0);
}

try {
  process.kill(pid, 'SIGTERM');
  fs.unlinkSync(pidFile);
  console.log(`Server stopped (PID ${pid}).`);
} catch (error) {
  if (error.code === 'ESRCH') {
    fs.unlinkSync(pidFile);
    console.log('Stale PID file removed.');
    process.exit(0);
  }
  throw error;
}
