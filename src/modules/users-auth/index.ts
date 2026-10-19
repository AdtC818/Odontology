import { RoleEntity } from './domain/role.entity';
import { UserEntity } from './domain/user.entity';
import { IUserRepository, UserWithRolesDomainDTO } from './domain/user.repository.interface';

export * from './domain/role.entity';
export * from './domain/user.entity';
export * from './domain/one-time-token.vo';
export * from './domain/user.repository.interface';

export * from './application/create-user.use-case';
export * from './application/update-user.use-case';
export * from './application/toggle-user-status.use-case';
export * from './application/search-users.use-case';
export * from './application/authenticate-user.use-case';
export * from './application/close-session.use-case';
export * from './application/recover-password.use-case';
export * from './application/create-role.use-case';
export * from './application/update-role.use-case';
export * from './application/delete-role.use-case';

/**
 * Public API del módulo users-auth para ser consumida por otros módulos (Vertical Slices)
 * sin acoplarse a la infraestructura interna.
 */
export class UsersAuthModulePublicApi {
  constructor(private readonly userRepository: IUserRepository) {}

  public async isActiveUser(idUsuario: number): Promise<boolean> {
    const user = await this.userRepository.findById(idUsuario);
    return Boolean(user && user.estado);
  }

  public async getUserWithRoles(idUsuario: number): Promise<UserWithRolesDomainDTO | null> {
    return this.userRepository.findById(idUsuario);
  }

  public async userHasPermission(idUsuario: number, rfCode: string): Promise<boolean> {
    const user = await this.userRepository.findById(idUsuario);
    if (!user || !user.estado) {
      return false;
    }

    const roleEntities = user.roles.map((r) =>
      RoleEntity.reconstitute({
        idRol: r.idRol,
        codigo: r.codigo ?? r.nombreRol.toUpperCase(),
        nombreRol: r.nombreRol,
        descripcion: r.descripcion ?? '',
        permisos: r.permisos ?? [],
        estadoAsignacion: r.estadoAsignacion,
      })
    );

    const domainUser = UserEntity.reconstitute({
      idUsuario: user.idUsuario,
      nombreCompleto: user.nombreCompleto,
      documentoIdentidad: user.documentoIdentidad,
      correo: user.correo,
      telefono: user.telefono,
      contrasenaHash: 'REDACTED',
      estado: user.estado,
      firmaUrl: user.firmaUrl,
      roles: roleEntities,
    });

    return domainUser.getAggregatedPermissions().includes(rfCode);
  }

  public async getProfessionalSignatureUrl(idUsuario: number): Promise<string | null> {
    const user = await this.userRepository.findById(idUsuario);
    if (!user || !user.estado) {
      return null;
    }
    return user.firmaUrl ?? null;
  }
}