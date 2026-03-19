import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 16

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32) as Buffer
}

/**
 * Шифрует строку алгоритмом AES-256-GCM.
 * Формат результата: salt:iv:tag:ciphertext (всё в hex, разделитель «:»).
 * Ключ шифрования — `internalApiSecret` из Settings (передаётся как `secret`).
 */
export function encrypt(text: string, secret: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(secret, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  // authTag получается ПОСЛЕ cipher.final()
  const tag = cipher.getAuthTag()

  return [salt, iv, tag, encrypted].map(b => b.toString('hex')).join(':')
}

/**
 * Расшифровывает строку, зашифрованную функцией `encrypt`.
 * Ожидает формат: salt:iv:tag:ciphertext (hex).
 */
export function decrypt(encryptedText: string, secret: string): string {
  const parts = encryptedText.split(':')
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted format: expected salt:iv:tag:ciphertext')
  }
  const [saltHex, ivHex, tagHex, dataHex] = parts

  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')

  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${TAG_LENGTH}, got ${tag.length}`)
  }

  const key = deriveKey(secret, salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}
