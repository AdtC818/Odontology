import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { envConfig } from '../../../app/config/env.config';
import { RoleValidator } from '../domain/role.entity';
import { UserValidator } from '../domain/user.entity';
import { IUserRepository } from '../domain/user.repository.interface';
import { JsonMetadataStore } from '../infrastructure/json-metadata.store';

export class UsersAuthService {
  constructor(private readonly userRepo: IUserRepository) {}

  // RF-USR-005: Autenticación con bloqueo de 15 min tras 5 intentos fallidos
  async login(correo: string, contrasena: string) {
    const emailKey = (correo || '').trim().toLowerCase();
    const store = JsonMetadataStore.read();
    const attempt = store.loginAttempts[emailKey] || { failedCount: 0, lockedUntilISO: null };

    if (attempt.lockedUntilISO && new Date(attempt.lockedUntilISO) > new Date()) {
      throw new Error('Demasiados intentos fallidos. Intente de nuevo en 15 minutos');
    }

    const user = await this.userRepo.findByEmail(emailKey);
    const passwordMatches = user ? await bcrypt.compare(contrasena, user.contrasenaHash) : false;

    if (!user || !passwordMatches) {
      attempt.failedCount += 1;
      if (attempt.failedCount >= 5) {
        attempt.lockedUntilISO = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      store.loginAttempts[emailKey] = attempt;
      JsonMetadataStore.write(store);

      if (attempt.failedCount >= 5) {
        throw new Error('Demasiados intentos fallidos. Intente de nuevo en 15 minutos');
      }
      throw new Error('Correo o contraseña incorrectos');
    }

    if (!user.estado) {
      throw new Error('Usuario inactivo. Comuníquese con el administrador del sistema');
    }

    // Limpiar contador de fallos al autenticar con éxito
    delete store.loginAttempts[emailKey];
    JsonMetadataStore.write(store);

    const token = jwt.sign(
      {
        sub: user.idUsuario,
        correo: user.correo,
        nombreCompleto: user.nombreCompleto,
        roles: user.roles.map((r) => r.codigo),
        mustChangePassword: user.mustChangePassword,
      },
      envConfig.jwtSecret,
      { expiresIn: '8h' }
    );

    const draft = store.userMetadata[user.idUsuario]?.draftForm || null;

    return {
      token,
      mustChangePassword: user.mustChangePassword,
      draft,
      user: {
        idUsuario: user.idUsuario,
        nombreCompleto: user.nombreCompleto,
        documentoIdentidad: user.documentoIdentidad,
        correo: user.correo,
        telefono: user.telefono,
        roles: user.roles,
        permisos: user.permisosConsolidados,
      },
    };
  }

  // RF-USR-005: Cambio obligatorio de contraseña temporal en el primer ingreso
  async changeTemporaryPassword(idUsuario: number, nuevaContrasena: string, confirmacion: string) {
    if (nuevaContrasena !== confirmacion) {
      throw new Error('La nueva contraseña y su confirmación no coinciden.');
    }
    UserValidator.validatePasswordStrength(nuevaContrasena);

    const user = await this.userRepo.findById(idUsuario);
    if (!user) throw new Error('Usuario no encontrado.');

    const isSameAsTemporary = await bcrypt.compare(nuevaContrasena, user.contrasenaHash);
    if (isSameAsTemporary) {
      throw new Error('La nueva contraseña debe ser distinta de la contraseña temporal (RF-USR-005).');
    }

    const newHash = await bcrypt.hash(nuevaContrasena, 10);
    await this.userRepo.updatePassword(idUsuario, newHash, false);
  }

  // RF-USR-009: Solicitar enlace de recuperación de contraseña (válido 30 minutos)
  async requestPasswordRecovery(correo: string) {
    const emailKey = (correo || '').trim().toLowerCase();
    const user = await this.userRepo.findByEmail(emailKey);
    let simulatedOneTimeLink: string | null = null;

    if (user && user.estado) {
      const store = JsonMetadataStore.read();
      // Anular enlaces anteriores de este mismo correo (RF-USR-009)
      for (const t of Object.values(store.recoveryTokens)) {
        if (t.correo === emailKey) t.used = true;
      }

      const token = crypto.randomBytes(24).toString('hex');
      store.recoveryTokens[token] = {
        token,
        correo: emailKey,
        expiresAtISO: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        used: false,
      };
      JsonMetadataStore.write(store);
      simulatedOneTimeLink = `http://localhost:5173/recuperar-clave?token=${token}`;
    }

    return {
      // Mensaje idéntico siempre por confidencialidad (RF-USR-009 y RQNF-SEG-008)
      message: 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña',
      devPreviewLink: simulatedOneTimeLink,
    };
  }

  // RF-USR-009: Restablecer contraseña con enlace de un solo uso y levantar bloqueo de RF-USR-005
  async resetPasswordWithToken(token: string, nuevaContrasena: string, confirmacion: string) {
    const store = JsonMetadataStore.read();
    const record = store.recoveryTokens[token];

    if (!record || record.used || new Date(record.expiresAtISO) < new Date()) {
      throw new Error('El enlace no es válido o ya venció. Solicite uno nuevo');
    }
    if (nuevaContrasena !== confirmacion) {
      throw new Error('Las contraseñas ingresadas no coinciden.');
    }
    UserValidator.validatePasswordStrength(nuevaContrasena);

    const user = await this.userRepo.findByEmail(record.correo);
    if (!user || !user.estado) {
      throw new Error('El enlace no es válido o ya venció. Solicite uno nuevo');
    }

    const newHash = await bcrypt.hash(nuevaContrasena, 10);
    await this.userRepo.updatePassword(user.idUsuario, newHash, false);

    // Invalidar enlace y levantar bloqueo de 15 minutos (RF-USR-009)
    record.used = true;
    delete store.loginAttempts[record.correo];
    JsonMetadataStore.write(store);
  }

  // RF-USR-001: Crear usuario
  async createUser(dto: {
    nombreCompleto: string;
    documentoIdentidad: string;
    correo: string;
    telefono: string;
    contrasenaTemporal: string;
    rolesCodigos: string[];
    firmaBase64?: string;
  }) {
    UserValidator.validateUserFields(dto);
    UserValidator.validatePasswordStrength(dto.contrasenaTemporal);

    const hash = await bcrypt.hash(dto.contrasenaTemporal, 10);
    return this.userRepo.createUser({
      nombreCompleto: dto.nombreCompleto,
      documentoIdentidad: dto.documentoIdentidad,
      correo: dto.correo,
      telefono: dto.telefono,
      contrasenaHash: hash,
      rolesCodigos: dto.rolesCodigos,
      firmaBase64: dto.firmaBase64,
      mustChangePassword: true,
    });
  }

  // RF-USR-002: Editar usuario verificando último administrador y citas pendientes de profesionales
  async updateUser(
    idUsuario: number,
    dto: {
      nombreCompleto: string;
      documentoIdentidad: string;
      correo: string;
      telefono: string;
      nuevaContrasenaTemporal?: string;
      rolesCodigos: string[];
      firmaBase64?: string;
    }
  ) {
    UserValidator.validateUserFields(dto);

    const current = await this.userRepo.findById(idUsuario);
    if (!current) throw new Error('Usuario no encontrado.');

    const hadAdmin = current.roles.some((r) => r.codigo === 'ROL-ADM');
    const willHaveAdmin = dto.rolesCodigos.includes('ROL-ADM');
    if (hadAdmin && !willHaveAdmin) {
      const otherAdmins = await this.userRepo.countActiveAdminsExcluding(idUsuario);
      if (otherAdmins === 0) {
        throw new Error('No se puede quitar ROL-ADM al único administrador activo del sistema (RF-USR-002).');
      }
    }

    const willHaveProfessionalRole =
      dto.rolesCodigos.includes('ROL-ODO') || dto.rolesCodigos.includes('ROL-ESP');
    if (!willHaveProfessionalRole) {
      const citasActivas = await this.userRepo.getActiveAppointmentsForProfessional(idUsuario);
      if (citasActivas.length > 0) {
        const detalle = citasActivas.map((c) => `#${c.idCita} (${c.titulo} - ${c.estado})`).join(', ');
        throw new Error(
          `El profesional no puede quedar sin ROL-ODO ni ROL-ESP porque tiene citas activas: ${detalle} (RF-USR-002).`
        );
      }
    }

    let contrasenaHash: string | undefined;
    let mustChangePassword: boolean | undefined;
    if (dto.nuevaContrasenaTemporal && dto.nuevaContrasenaTemporal.trim() !== '') {
      UserValidator.validatePasswordStrength(dto.nuevaContrasenaTemporal);
      contrasenaHash = await bcrypt.hash(dto.nuevaContrasenaTemporal, 10);
      mustChangePassword = true;
    }

    return this.userRepo.updateUser(idUsuario, {
      nombreCompleto: dto.nombreCompleto,
      documentoIdentidad: dto.documentoIdentidad,
      correo: dto.correo,
      telefono: dto.telefono,
      contrasenaHash,
      rolesCodigos: dto.rolesCodigos,
      firmaBase64: dto.firmaBase64,
      mustChangePassword,
    });
  }

  // RF-USR-003: Activar / Inactivar usuario
  async toggleUserStatus(idUsuario: number, nuevoEstado: boolean) {
    const current = await this.userRepo.findById(idUsuario);
    if (!current) throw new Error('Usuario no encontrado.');

    if (!nuevoEstado) {
      if (current.roles.some((r) => r.codigo === 'ROL-ADM')) {
        const otherAdmins = await this.userRepo.countActiveAdminsExcluding(idUsuario);
        if (otherAdmins === 0) {
          throw new Error('No se puede inactivar al único usuario activo con ROL-ADM (RF-USR-003).');
        }
      }

      const citasActivas = await this.userRepo.getActiveAppointmentsForProfessional(idUsuario);
      if (citasActivas.length > 0) {
        const detalle = citasActivas.map((c) => `#${c.idCita} (${c.titulo} - ${c.estado})`).join(', ');
        throw new Error(
          `No se puede inactivar al profesional porque tiene citas por atender: ${detalle} (RF-USR-003).`
        );
      }
    }

    return this.userRepo.updateUserStatus(idUsuario, nuevoEstado);
  }

  // RF-USR-008: Guardar o descartar borrador por cierre automático de inactividad
  saveDraft(idUsuario: number, draftForm: { formId: string; data: any } | null) {
    const store = JsonMetadataStore.read();
    store.userMetadata[idUsuario] = {
      ...(store.userMetadata[idUsuario] || { mustChangePassword: false }),
      draftForm: draftForm ? { ...draftForm, savedAt: new Date().toISOString() } : null,
    };
    JsonMetadataStore.write(store);
  }

  // RF-USR-007, RF-USR-010, RF-USR-011: Gestión de roles en JSON
  async createRole(codigo: string, nombre: string, descripcion: string, permisos: string[]) {
    RoleValidator.validateNewRole(codigo, nombre, permisos);
    return this.userRepo.createRole({
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      permisos,
      esInicial: false,
    });
  }

  async updateRole(codigo: string, nombre: string, descripcion: string, permisos: string[]) {
    const store = JsonMetadataStore.read();
    const existing = store.roles[codigo];
    if (!existing) throw new Error('El rol seleccionado no existe.');
    RoleValidator.validateEditRole(existing, nombre, permisos);
    return this.userRepo.updateRole(codigo, nombre, descripcion, permisos);
  }

  async deleteRole(codigo: string) {
    return this.userRepo.deleteRole(codigo);
  }
}