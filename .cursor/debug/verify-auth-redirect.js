const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const logPath = path.join(__dirname, 'debug-auth-buttons.log');

function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path: urlPath,
        method,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload)
            }
          : {}
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            location: res.headers.location || '',
            body: data
          });
        });
      }
    );
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

(async () => {
  const lines = [];
  const auth = await req('GET', '/auth');
  lines.push({
    step: 'redirect',
    status: auth.status,
    location: auth.location,
    ok: auth.status === 302 && auth.location === '/auth.html'
  });

  const page = await req('GET', '/auth.html');
  lines.push({
    step: 'page',
    status: page.status,
    hasForm: page.body.includes('id="registerForm"'),
    absScripts: page.body.includes('/src/ui/auth-page.js')
  });

  const script = await req('GET', '/src/ui/auth-page.js');
  lines.push({ step: 'script', status: script.status, ok: script.status === 200 });

  const register = await req('POST', '/api/auth/register', {
    email: 'verify.redirect@example.com',
    firstName: 'Vera',
    lastName: 'Redirect'
  });
  lines.push({
    step: 'register',
    status: register.status,
    hasOtp: /"devOtp"\s*:/.test(register.body)
  });

  fs.appendFileSync(logPath, `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`);
  console.log(JSON.stringify(lines, null, 2));
  const failed = lines.some((l) => l.ok === false || l.status >= 400);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
