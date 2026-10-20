// src/modules/users-auth/infrastructure/password-hasher.service.ts
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { IPasswordHasher } from '../domain/user.repository.interface';

export class HybridPasswordHasherService implements IPasswordHasher {
  private static readonly HASH_PREFIX = 'scrypt$';

  /**
   * Genera un hash seguro con salt aleatorio para almacenar en usuario.contrasena_hash
   */
  public async hash(plainText: string): Promise<string> {
    if (plainText.startsWith(HybridPasswordHasherService.HASH_PREFIX)) {
      return plainText;
    }
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(plainText, salt, 64).toString('hex');
    return `${HybridPasswordHasherService.HASH_PREFIX}${salt}$${derivedKey}`;
  }

  /**
   * Compara una contraseña en texto plano contra el valor almacenado en la BD.
   * Soporta:
   * 1. Hashes generados con formato "scrypt$<salt>$<hash>"
   * 2. Contraseñas en texto plano existentes en la BD (para semillas o pruebas manuales)
   */
  public async compare(plainText: string, storedHashOrPlain: string): Promise<boolean> {
    if (!plainText || !storedHashOrPlain) {
      return false;
    }

    // Caso 1: La contraseña en la BD está hasheada con nuestro formato scrypt$
    if (storedHashOrPlain.startsWith(HybridPasswordHasherService.HASH_PREFIX)) {
      const parts = storedHashOrPlain.split('$');
      if (parts.length !== 3) return false;

      const [, salt, originalKeyHex] = parts;
      const derivedBuffer = scryptSync(plainText, salt, 64);
      const originalBuffer = Buffer.from(originalKeyHex, 'hex');

      if (derivedBuffer.length !== originalBuffer.length) {
        return false;
      }
      return timingSafeEqual(derivedBuffer, originalBuffer);
    }

    // Caso 2: La contraseña en la BD no está hasheada (texto plano de semillas SQL)
    return plainText === storedHashOrPlain;
  }
}