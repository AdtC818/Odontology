import { RoleEntity } from '../domain/role.entity';
import { UserEntity } from '../domain/user.entity';
import {
  IAuditLoggerPort,
  IPasswordHasher,
  IUserRepository,
  LoginLockoutRecordDTO,
  UserWithRolesDomainDTO,
} from '../domain/user.repository.interface';

export interface AuthenticateUserCommand {
  correo: string;
  contrasena: string;
  nuevaContrasena?: string;
  confirmacionNuevaContrasena?: string;
  now?: Date;
}

export interface AuthenticateUserResult {
  requiereCambioContrasena: boolean;
  message: string;
  usuario?: UserWithRolesDomainDTO;
  permisos?: string[];
}

export class AuthenticateUserUseCase {
  // Fallback en memoria para garantizar el bloqueo de 15 min para correos registrados o no (RF-USR-005)
  private static readonly memoryLockoutStore = new Map<string, LoginLockoutRecordDTO>();

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher?: IPasswordHasher,
    private readonly auditLogger?: IAuditLoggerPort
  ) {}

  public static clearLockoutForEmail(correo: string): void {
    AuthenticateUserUseCase.memoryLockoutStore.delete(correo.trim().toLowerCase());
  }

  public async execute(command: AuthenticateUserCommand): Promise<AuthenticateUserResult> {
    const now = command.now ?? new Date();
    const normalizedEmail = (command.correo ?? '').trim().toLowerCase();

    if (!normalizedEmail || !command.contrasena) {
      throw new Error('Correo o contraseña incorrectos');
    }

    // 1. Verificar si el correo (registrado o no) se encuentra bloqueado (RF-USR-005)
    const lockout = await this.getLockoutRecord(normalizedEmail);
    if (lockout.bloqueadoHasta && lockout.bloqueadoHasta.getTime() > now.getTime()) {
      await this.logAudit(normalizedEmail, 'RF-USR-005: Intento de acceso en cuenta bloqueada');
      throw new Error('Demasiados intentos fallidos. Intente de nuevo en 15 minutos');
    }

    // Si el bloqueo ya expiró, reiniciar contador
    if (lockout.bloqueadoHasta && lockout.bloqueadoHasta.getTime() <= now.getTime()) {
      await this.resetLockoutRecord(normalizedEmail);
    }

    // 2. Consultar credenciales del usuario
    const authRecord = this.userRepository.findAuthCredentialsByEmail
      ? await this.userRepository.findAuthCredentialsByEmail(normalizedEmail)
      : null;

    if (!authRecord) {
      await this.registerFailedAttempt(normalizedEmail, now);
      throw new Error('Correo o contraseña incorrectos');
    }

    const passwordMatches = this.passwordHasher
      ? await this.passwordHasher.compare(command.contrasena, authRecord.contrasenaHash)
      : command.contrasena === authRecord.contrasenaHash;

    if (!passwordMatches) {
      await this.registerFailedAttempt(normalizedEmail, now);
      throw new Error('Correo o contraseña incorrectos');
    }

    // 3. Validar que el usuario esté Activo (RF-USR-005)
    if (!authRecord.estado) {
      await this.logAudit(normalizedEmail, 'RF-USR-005: Intento de inicio de sesión de usuario inactivo');
      throw new Error('Usuario inactivo. Comuníquese con el administrador del sistema');
    }

    // Credenciales válidas y usuario activo: reiniciar contador de intentos fallidos
    await this.resetLockoutRecord(normalizedEmail);

    // 4. Manejo de contraseña temporal en primer ingreso (RF-USR-005)
    if (authRecord.esContrasenaTemporal) {
      if (!command.nuevaContrasena || !command.confirmacionNuevaContrasena) {
        return {
          requiereCambioContrasena: true,
          message: 'Debe cambiar su contraseña temporal antes de acceder al sistema.',
        };
      }

      if (command.nuevaContrasena !== command.confirmacionNuevaContrasena) {
        throw new Error('La nueva contraseña y su confirmación no coinciden.');
      }

      if (command.nuevaContrasena === command.contrasena) {
        throw new Error('La nueva contraseña debe ser distinta de la contraseña temporal.');
      }

      UserEntity.validatePlainPassword(command.nuevaContrasena);

      const newHash = this.passwordHasher
        ? await this.passwordHasher.hash(command.nuevaContrasena)
        : command.nuevaContrasena;

      if (this.userRepository.updatePassword) {
        await this.userRepository.updatePassword(authRecord.idUsuario, newHash, false);
      }
      authRecord.esContrasenaTemporal = false;
    }

    // 5. Construir entidad de dominio para sumar permisos de sus roles activos
    const roleEntities = authRecord.roles.map((r) =>
      RoleEntity.reconstitute({
        idRol: r.idRol,
        codigo: r.codigo ?? r.nombreRol.toUpperCase(),
        nombreRol: r.nombreRol,
        descripcion: r.descripcion ?? '',
        permisos: r.permisos ?? [],
        estadoAsignacion: r.estadoAsignacion,
      })
    );

    const userEntity = UserEntity.reconstitute({
      idUsuario: authRecord.idUsuario,
      nombreCompleto: authRecord.nombreCompleto,
      documentoIdentidad: authRecord.documentoIdentidad,
      correo: authRecord.correo,
      telefono: authRecord.telefono,
      contrasenaHash: authRecord.contrasenaHash,
      esContrasenaTemporal: false,
      estado: authRecord.estado,
      firmaUrl: authRecord.firmaUrl,
      roles: roleEntities,
    });

    await this.logAudit(
      authRecord.correo,
      'RF-USR-005: Inicio de sesión exitoso',
      `usuario:${authRecord.idUsuario}`
    );

    return {
      requiereCambioContrasena: false,
      message: 'Autenticación exitosa.',
      usuario: {
        idUsuario: authRecord.idUsuario,
        nombreCompleto: authRecord.nombreCompleto,
        documentoIdentidad: authRecord.documentoIdentidad,
        correo: authRecord.correo,
        telefono: authRecord.telefono,
        estado: authRecord.estado,
        esContrasenaTemporal: false,
        firmaUrl: authRecord.firmaUrl,
        roles: authRecord.roles,
      },
      permisos: userEntity.getAggregatedPermissions(),
    };
  }

  private async getLockoutRecord(correo: string): Promise<LoginLockoutRecordDTO> {
    if (this.userRepository.getLoginLockoutByEmail) {
      const dbRecord = await this.userRepository.getLoginLockoutByEmail(correo);
      if (dbRecord) return dbRecord;
    }
    return (
      AuthenticateUserUseCase.memoryLockoutStore.get(correo) ?? {
        correo,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      }
    );
  }

  private async registerFailedAttempt(correo: string, now: Date): Promise<void> {
    const current = await this.getLockoutRecord(correo);
    const intentosFallidos = current.intentosFallidos + 1;
    const bloqueadoHasta =
      intentosFallidos >= UserEntity.MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + UserEntity.LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : null;

    const updated: LoginLockoutRecordDTO = {
      correo,
      intentosFallidos,
      bloqueadoHasta,
    };

    AuthenticateUserUseCase.memoryLockoutStore.set(correo, updated);
    if (this.userRepository.saveLoginLockoutByEmail) {
      await this.userRepository.saveLoginLockoutByEmail(updated);
    }

    await this.logAudit(
      correo,
      `RF-USR-005: Intento fallido de inicio de sesión (${intentosFallidos}/${UserEntity.MAX_FAILED_ATTEMPTS})`
    );
  }

  private async resetLockoutRecord(correo: string): Promise<void> {
    const resetRecord: LoginLockoutRecordDTO = {
      correo,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    };
    AuthenticateUserUseCase.memoryLockoutStore.set(correo, resetRecord);
    if (this.userRepository.saveLoginLockoutByEmail) {
      await this.userRepository.saveLoginLockoutByEmail(resetRecord);
    }
  }

  private async logAudit(
    usuario: string,
    accion: string,
    registroAfectado: string = 'auth:login'
  ): Promise<void> {
    if (this.auditLogger) {
      await this.auditLogger.log({
        usuario,
        accion,
        registroAfectado,
      });
    }
  }
}