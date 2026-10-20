import {
  IAuditLoggerPort,
  IDraftStorageService,
  IUserRepository,
  SessionDraftDTO,
} from '../domain/user.repository.interface';

export interface CloseSessionCommand {
  idUsuario: number;
  motivo: 'MANUAL' | 'INACTIVITY_TIMEOUT';
  tieneCambiosSinGuardar?: boolean;
  confirmadoPorUsuario?: boolean;
  borrador?: {
    formularioId: string;
    datosBorrador: Record<string, unknown>;
  };
  now?: Date;
}

export interface CloseSessionResult {
  sesionCerrada: boolean;
  requiereConfirmacion: boolean;
  borradorGuardado: boolean;
  message: string;
  borrador?: SessionDraftDTO;
}

export class CloseSessionUseCase {
  public static readonly INACTIVITY_TIMEOUT_MINUTES = 30;
  public static readonly WARNING_MINUTE = 29;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly draftStorageService?: IDraftStorageService,
    private readonly auditLogger?: IAuditLoggerPort
  ) {}

  public async execute(command: CloseSessionCommand): Promise<CloseSessionResult> {
    const now = command.now ?? new Date();

    // Si es cierre manual y hay cambios sin guardar, exige confirmación previa (RF-USR-008)
    if (
      command.motivo === 'MANUAL' &&
      command.tieneCambiosSinGuardar &&
      !command.confirmadoPorUsuario
    ) {
      return {
        sesionCerrada: false,
        requiereConfirmacion: true,
        borradorGuardado: false,
        message: 'Tiene cambios sin guardar. ¿Está seguro de que desea cerrar la sesión?',
      };
    }

    let savedDraft: SessionDraftDTO | undefined;

    // En cierre automático por inactividad (30 min), conserva los cambios como borrador (RF-USR-008)
    if (
      command.motivo === 'INACTIVITY_TIMEOUT' &&
      command.tieneCambiosSinGuardar &&
      command.borrador
    ) {
      savedDraft = {
        idUsuario: command.idUsuario,
        formularioId: command.borrador.formularioId,
        datosBorrador: command.borrador.datosBorrador,
        fechaGuardado: now,
      };

      if (this.draftStorageService) {
        await this.draftStorageService.saveDraft(savedDraft);
      }
    }

    if (this.userRepository.invalidateUserSessions) {
      await this.userRepository.invalidateUserSessions(command.idUsuario);
    }

    if (this.auditLogger) {
      await this.auditLogger.log({
        usuario: `usuario:${command.idUsuario}`,
        accion:
          command.motivo === 'INACTIVITY_TIMEOUT'
            ? 'RF-USR-008: Cierre automático de sesión por 30 minutos de inactividad'
            : 'RF-USR-008: Cierre manual de sesión',
        registroAfectado: `sesion:${command.idUsuario}`,
        valorNuevo: savedDraft ? { borradorFormulario: savedDraft.formularioId } : undefined,
      });
    }

    return {
      sesionCerrada: true,
      requiereConfirmacion: false,
      borradorGuardado: Boolean(savedDraft),
      message:
        command.motivo === 'INACTIVITY_TIMEOUT'
          ? 'La sesión se cerró automáticamente por 30 minutos de inactividad.'
          : 'Sesión cerrada exitosamente.',
      borrador: savedDraft,
    };
  }
}