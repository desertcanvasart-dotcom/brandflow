/**
 * AES-256-GCM encryption for OAuth tokens at rest.
 * Uses EMAIL_ENCRYPTION_KEY env var (32-byte hex string).
 */
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY
  if (!key) {
    throw new Error('EMAIL_ENCRYPTION_KEY environment variable is not set')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a plaintext string. Returns base64-encoded string containing IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Format: IV (12 bytes) + Tag (16 bytes) + Ciphertext
  const combined = Buffer.concat([iv, tag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt a base64-encoded encrypted string back to plaintext.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getKey()
  const combined = Buffer.from(encryptedBase64, 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
