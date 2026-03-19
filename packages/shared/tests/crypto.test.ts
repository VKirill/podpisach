import { encrypt, decrypt } from '../src/crypto.ts'

describe('crypto', () => {
  const SECRET = 'test-secret-key-32chars-minimum!!'
  const TEXT = 'bot-token-123:ABC'

  test('encrypt/decrypt roundtrip', () => {
    const encrypted = encrypt(TEXT, SECRET)
    expect(encrypted).not.toBe(TEXT)
    expect(decrypt(encrypted, SECRET)).toBe(TEXT)
  })

  test('encrypted output has salt:iv:tag:ciphertext format', () => {
    const encrypted = encrypt(TEXT, SECRET)
    const parts = encrypted.split(':')
    expect(parts).toHaveLength(4)
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/i)
    }
  })

  test('roundtrip preserves special chars and unicode', () => {
    const specialText = 'token:with:colons и unicode 🔑'
    const encrypted = encrypt(specialText, SECRET)
    expect(decrypt(encrypted, SECRET)).toBe(specialText)
  })

  test('same text encrypts differently each time (random salt/iv)', () => {
    const e1 = encrypt(TEXT, SECRET)
    const e2 = encrypt(TEXT, SECRET)
    expect(e1).not.toBe(e2)
  })

  test('different secrets produce different ciphertexts', () => {
    const e1 = encrypt(TEXT, 'key1')
    const e2 = encrypt(TEXT, 'key2')
    expect(e1).not.toBe(e2)
  })

  test('wrong secret fails to decrypt', () => {
    const encrypted = encrypt(TEXT, 'correct-key')
    expect(() => decrypt(encrypted, 'wrong-key')).toThrow()
  })

  test('corrupted ciphertext throws on decrypt', () => {
    expect(() => decrypt('invalid-format', SECRET)).toThrow()
  })

  test('empty string roundtrip', () => {
    const encrypted = encrypt('', SECRET)
    expect(decrypt(encrypted, SECRET)).toBe('')
  })
})
