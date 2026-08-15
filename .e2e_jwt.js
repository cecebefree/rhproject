// Generate JWT for front-desk-read-leads test
const header = { alg: 'HS256', typ: 'JWT' };
const payload = {
  iss: 'supabase',
  role: 'authenticated',
  app_metadata: {
    role: 'admin',
    tenant_id: 'e97e5c3a-1234-4321-abcd-000000000001'
  },
  exp: Math.floor(Date.now() / 1000) + 3600
};

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

const secret = 'super-secret-jwt-token-with-at-least-32-characters-long';
const crypto = require('crypto');
const sig = crypto.createHmac('sha256', secret)
  .update(base64url(header) + '.' + base64url(payload))
  .digest('base64url');

const token = base64url(header) + '.' + base64url(payload) + '.' + sig;
console.log(token);
