// Google "ile giriş" kimlik jetonunu doğrular (imza, yayıncı, hedef kitle, süre, e-posta doğrulaması).
import { createRemoteJWKSet, jwtVerify } from 'jose';

const remote = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export async function verifyGoogleToken(idToken, { clientId = process.env.GOOGLE_CLIENT_ID, jwks = remote } = {}) {
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID tanımlı değil');
  const { payload } = await jwtVerify(idToken, jwks, { audience: clientId, issuer: ['https://accounts.google.com', 'accounts.google.com'] });
  if (payload.email_verified !== true || !payload.email) throw new Error('E-posta doğrulanmamış');
  return { email: String(payload.email).toLowerCase(), name: payload.name || '' };
}
