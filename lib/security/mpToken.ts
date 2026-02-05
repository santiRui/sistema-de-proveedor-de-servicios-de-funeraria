import crypto from 'crypto'

// AES-256-CBC helpers for encrypting/decrypting Mercado Pago access tokens
// NOTE: MP_TOKEN_ENCRYPTION_KEY must be a 32-byte key, encoded in base64.

const ALGORITHM = 'aes-256-cbc'

function getKey(): Buffer {
  const keyBase64 = process.env.MP_TOKEN_ENCRYPTION_KEY
  if (!keyBase64) {
    throw new Error('MP_TOKEN_ENCRYPTION_KEY env var is not set')
  }

  const key = Buffer.from(keyBase64, 'base64')
  if (key.length !== 32) {
    throw new Error('MP_TOKEN_ENCRYPTION_KEY must be 32 bytes when decoded from base64')
  }
  return key
}

export function encryptMpToken(plain: string): { encrypted: string; iv: string } {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plain, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return {
    encrypted,
    iv: iv.toString('base64'),
  }
}

export function decryptMpToken(encrypted: string, iv: string): string {
  const key = getKey()
  const ivBuf = Buffer.from(iv, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf)
  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
