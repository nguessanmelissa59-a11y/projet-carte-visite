const path = require('node:path');
const os = require('node:os');

function detectLanIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    if (/vethernet|wsl|vmware|vbox|virtual|loopback/i.test(name)) continue;
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
const CACHED_LAN_IP = detectLanIpAddress();

function getLanIpAddress() {
  return CACHED_LAN_IP;
}

module.exports = {
  PORT,
  HOST,
  PUBLIC_ROOT,
  DB_DIR,
  DB_PATH,
  getLanIpAddress
};
