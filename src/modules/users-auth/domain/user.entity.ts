export class UserValidator {
  // RF-USR-001: Reglas de validación de campos de usuario
  static validateUserFields(data: {
    documentoIdentidad: string;
    nombreCompleto: string;
    correo: string;
    telefono?: string;
    rolesCodigos: string[];
    firmaBase64?: string;
  }): void {
    if (!data.nombreCompleto?.trim()) {
      throw new Error('Campo nombreCompleto: El nombre completo es obligatorio.');
    }
    if (!/^\d+$/.test(data.documentoIdentidad || '')) {
      throw new Error('Campo documentoIdentidad: El documento debe contener solo dígitos numéricos.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo || '')) {
      throw new Error('Campo correo: El correo electrónico debe tener formato usuario@dominio.');
    }
    if (!data.telefono || !/^\d{10}$/.test(data.telefono)) {
      throw new Error('Campo telefono: El teléfono es obligatorio y debe tener exactamente 10 dígitos.');
    }
    if (!Array.isArray(data.rolesCodigos) || data.rolesCodigos.length === 0) {
      throw new Error('Campo roles: El usuario debe tener al menos un rol asignado.');
    }
    if (data.rolesCodigos.includes('ROL-PAC')) {
      throw new Error('Campo roles: El rol ROL-PAC no puede asignarse a ninguna cuenta de usuario (RF-USR-001).');
    }
    if (data.firmaBase64) {
      const isPngOrJpg = /^data:image\/(png|jpeg|jpg);base64,/.test(data.firmaBase64);
      if (!isPngOrJpg) {
        throw new Error('Campo firma: La imagen de firma debe estar en formato PNG o JPG.');
      }
      const sizeInBytes = Math.ceil((data.firmaBase64.length * 3) / 4);
      if (sizeInBytes > 2 * 1024 * 1024) {
        throw new Error('Campo firma: La imagen de firma no debe superar los 2 MB.');
      }
    }
  }

  // RF-USR-001 / RF-USR-005: Mínimo 8 caracteres, al menos una letra y un número
  static validatePasswordStrength(password: string): void {
    const hasMinLength = password && password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password || '');
    const hasNumber = /\d/.test(password || '');

    if (!hasMinLength || !hasLetter || !hasNumber) {
      throw new Error(
        'Campo contrasena: La contraseña debe tener mínimo 8 caracteres con al menos una letra y un número (RF-USR-001).'
      );
    }
  }
}