const { spawn } = require('child_process');
const path = require('path');

console.log('⚡ ===================================================');
console.log('🚀 Starting VoltPath - EcoTrack AI Full Stack Project');
console.log('⚡ ===================================================');
console.log('📍 Backend:  http://localhost:5500');
console.log('📍 Frontend: http://localhost:5173');
console.log('---------------------------------------------------\n');

const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true,
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true,
});

const handleExit = () => {
  try { backend.kill(); } catch (_) {}
  try { frontend.kill(); } catch (_) {}
  process.exit();
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
