const path = require('node:path');
const os = require('node:os');

function getLanIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_ROOT = path.resolve(__dirname, '..', '..');
const DB_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'cards.sqlite');

module.exports = {
  PORT,
  HOST,
  PUBLIC_ROOT,
  DB_DIR,
  DB_PATH,
  getLanIpAddress
};

