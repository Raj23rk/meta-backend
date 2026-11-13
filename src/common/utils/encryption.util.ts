import * as crypto from 'crypto';

export class EncryptionUtil {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly key = Buffer.from(
    process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'hex',
  );

  static encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  static decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    try {
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      // If decryption fails, return fallback or original
      return encryptedText;
    }
  }
}

