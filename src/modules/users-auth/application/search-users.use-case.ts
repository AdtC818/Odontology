import {
  IUserRepository,
  SearchUsersFilterDTO,
  UserWithRolesDomainDTO,
} from '../domain/user.repository.interface';

export interface SearchUsersQuery {
  documento?: string;
  nombre?: string;
  idRol?: number;
  codigoRol?: string;
  estado?: boolean;
}

export interface SearchUsersResult {
  message?: string;
  data: UserWithRolesDomainDTO[];
}

export class SearchUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(query: SearchUsersQuery = {}): Promise<SearchUsersResult> {
    const cleanDocumento = query.documento?.trim() || undefined;
    const cleanNombre = query.nombre?.trim() || undefined;

    const repoFilters: SearchUsersFilterDTO = {
      documento: cleanDocumento,
      estado: query.estado,
      idRol: query.idRol,
      codigoRol: query.codigoRol,
    };

    // Obtenemos los usuarios del repositorio y aplicamos normalización NFD en memoria
    // para garantizar búsqueda insensible a tildes y mayúsculas (RF-USR-004)
    // incluso si PostgreSQL no tiene la extensión unaccent instalada.
    const users = await this.userRepository.searchUsers(repoFilters);

    const filteredUsers = users
      .filter((user) => {
        if (cleanDocumento && user.documentoIdentidad !== cleanDocumento) {
          return false;
        }

        if (cleanNombre) {
          const normalizedUserName = this.normalizeText(user.nombreCompleto);
          const normalizedQueryName = this.normalizeText(cleanNombre);
          if (!normalizedUserName.includes(normalizedQueryName)) {
            return false;
          }
        }

        if (query.idRol !== undefined) {
          const hasRoleById = user.roles.some(
            (r) => r.estadoAsignacion && Number(r.idRol) === Number(query.idRol)
          );
          if (!hasRoleById) return false;
        }

        if (query.codigoRol) {
          const targetRole = this.normalizeText(query.codigoRol);
          const hasRoleByCodeOrName = user.roles.some(
            (r) =>
              r.estadoAsignacion &&
              (this.normalizeText(r.codigo ?? '') === targetRole ||
                this.normalizeText(r.nombreRol) === targetRole)
          );
          if (!hasRoleByCodeOrName) return false;
        }

        if (query.estado !== undefined && user.estado !== query.estado) {
          return false;
        }

        return true;
      })
      .sort((a, b) =>
        a.nombreCompleto.localeCompare(b.nombreCompleto, 'es-CO', { sensitivity: 'base' })
      );

    if (filteredUsers.length === 0) {
      return {
        message: 'ninguna coincidencia encontrada',
        data: [],
      };
    }

    return {
      data: filteredUsers,
    };
  }

  private normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}