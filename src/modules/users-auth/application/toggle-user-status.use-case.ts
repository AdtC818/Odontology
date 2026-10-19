import {
  IAuditLoggerPort,
  IUserRepository,
  UserWithRolesDomainDTO,
} from '../domain/user.repository.interface';

export interface ToggleUserStatusCommand {
  ejecutadoPorUsuario?: string;
  idUsuario: number;
  nuevoEstado: boolean;
}

export interface ToggleUserStatusResult {
  message: string;
  data: UserWithRolesDomainDTO;
}

export class ToggleUserStatusUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLogger?: IAuditLoggerPort
  ) {}

  public async execute(command: ToggleUserStatusCommand): Promise<ToggleUserStatusResult> {
    if (!command.idUsuario || Number.isNaN(Number(command.idUsuario))) {
      throw new Error('El identificador del usuario es inválido.');
    }

    const existingUser = await this.userRepository.findById(command.idUsuario);
    if (!existingUser) {
      throw new Error(`El usuario con ID ${command.idUsuario} no existe.`);
    }

    // Validaciones al intentar inactivar (RF-USR-003)
    if (!command.nuevoEstado) {
      const isUserAdmin = existingUser.roles.some(
        (r) =>
          r.estadoAsignacion &&
          (r.codigo === 'ROL-ADM' || r.nombreRol.toLowerCase().includes('administrador'))
      );

      if (isUserAdmin) {
        const remainingAdmins = await this.countRemainingActiveAdmins(command.idUsuario);
        if (remainingAdmins === 0) {
          throw new Error(
            'No se puede inactivar al único usuario activo con rol Administrador del sistema (ROL-ADM) (RF-USR-003).'
          );
        }
      }

      if (this.userRepository.findActiveAppointmentsByProfessional) {
        const activeAppointments =
          await this.userRepository.findActiveAppointmentsByProfessional(command.idUsuario);
        if (activeAppointments.length > 0) {
          const listadoCitas = activeAppointments
            .map((c) => `#${c.idCita} (${c.titulo} - ${c.estado})`)
            .join(', ');
          throw new Error(
            `No se puede inactivar al profesional porque tiene ${activeAppointments.length} cita(s) pendiente(s) por atender: [${listadoCitas}] (RF-USR-003).`
          );
        }
      }
    }

    const updatedUser = await this.userRepository.updateStatus(
      command.idUsuario,
      Boolean(command.nuevoEstado)
    );

    if (!updatedUser) {
      throw new Error('No fue posible actualizar el estado del usuario.');
    }

    if (!command.nuevoEstado && this.userRepository.invalidateUserSessions) {
      await this.userRepository.invalidateUserSessions(command.idUsuario);
    }

    if (this.auditLogger) {
      await this.auditLogger.log({
        usuario: command.ejecutadoPorUsuario || 'ROL-ADM',
        accion: 'RF-USR-003: Gestionar estado usuario',
        registroAfectado: `usuario:${command.idUsuario}`,
        valorAnterior: { estado: existingUser.estado },
        valorNuevo: { estado: updatedUser.estado },
      });
    }

    return {
      message: `Usuario ${command.nuevoEstado ? 'activado' : 'inactivado'} exitosamente.`,
      data: updatedUser,
    };
  }

  private async countRemainingActiveAdmins(excludeUserId: number): Promise<number> {
    if (this.userRepository.countActiveAdmins) {
      return this.userRepository.countActiveAdmins(excludeUserId);
    }
    const activeUsers = await this.userRepository.searchUsers({ estado: true });
    return activeUsers.filter(
      (u) =>
        u.idUsuario !== excludeUserId &&
        u.roles.some(
          (r) =>
            r.estadoAsignacion &&
            (r.codigo === 'ROL-ADM' || r.nombreRol.toLowerCase().includes('administrador'))
        )
    ).length;
  }
}