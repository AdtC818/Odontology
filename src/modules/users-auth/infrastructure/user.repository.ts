// src/modules/users-auth/infrastructure/user.repository.ts
import { db } from '../../../shared/infrastructure/database/database';
import {
  ADMIN_USER_ROLE_PERMISSIONS,
  CLINICAL_PERMISSIONS,
} from '../domain/role.entity';
import {
  ActiveAppointmentSummaryDTO,
  CreateUserPersistenceDTO,
  IUserRepository,
  RoleDTO,
  SearchUsersFilterDTO,
  UpdateUserPersistenceDTO,
  UserAuthCredentialsRecord,
  UserWithRolesDomainDTO,
} from '../domain/user.repository.interface';
import { RoleRow } from './user.model';

interface RoleJsonConfigMeta {
  codigo: string;
  descripcion: string;
  permisos: string[];
}

interface UserExtendedMeta {
  esContrasenaTemporal: boolean;
  firmaUrl: string | null;
}

export class UserRepository implements IUserRepository {
  // Almacén configurable JSON en caliente (RQNF-MAN-002) sincronizado con public.rol
  private static readonly roleMetadataStore = new Map<string, RoleJsonConfigMeta>([
    [
      'administrador del sistema',
      {
        codigo: 'ROL-ADM',
        descripcion: 'Administrador general de usuarios, roles, plantillas y agenda.',
        permisos: [
          ...ADMIN_USER_ROLE_PERMISSIONS,
          'RF-AGE-001',
          'RF-AGE-002',
          'RF-AGE-005',
          'RF-AGE-006',
          'RF-AGE-007',
          'RF-AGE-008',
          'RF-AGE-012',
          'RF-AGE-013',
          'RF-HCL-001',
          'RF-HCL-002',
          'RF-HCL-003',
          'RF-HCL-004',
          'RF-HCL-010',
          'RF-CON-004',
          'RF-CON-007',
          'RF-CON-008',
        ],
      },
    ],
    [
      'odontólogo general',
      {
        codigo: 'ROL-ODO',
        descripcion: 'Odontólogo general responsable de consulta e historia clínica.',
        permisos: [
          'RF-AGE-008',
          'RF-AGE-009',
          'RF-AGE-013',
          'RF-HCL-001',
          'RF-HCL-002',
          'RF-HCL-003',
          'RF-HCL-004',
          ...CLINICAL_PERMISSIONS,
        ],
      },
    ],
    [
      'especialista en ortodoncia',
      {
        codigo: 'ROL-ESP',
        descripcion: 'Especialista en ortodoncia responsable de consulta e historia clínica.',
        permisos: [
          'RF-AGE-008',
          'RF-AGE-009',
          'RF-AGE-013',
          'RF-HCL-001',
          'RF-HCL-002',
          'RF-HCL-003',
          'RF-HCL-004',
          ...CLINICAL_PERMISSIONS,
        ],
      },
    ],
    [
      'coordinadora de agendamiento',
      {
        codigo: 'ROL-COA',
        descripcion: 'Gestiona la agenda de todos los profesionales y datos de pacientes.',
        permisos: [
          'RF-AGE-001',
          'RF-AGE-002',
          'RF-AGE-005',
          'RF-AGE-006',
          'RF-AGE-007',
          'RF-AGE-008',
          'RF-AGE-012',
          'RF-AGE-013',
          'RF-HCL-001',
          'RF-HCL-002',
          'RF-HCL-003',
          'RF-HCL-004',
          'RF-HCL-010',
        ],
      },
    ],
    [
      'auxiliar de odontología',
      {
        codigo: 'ROL-AUX',
        descripcion: 'Apoya en agendamiento y asiste en consulta en curso.',
        permisos: [
          'RF-AGE-001',
          'RF-AGE-002',
          'RF-AGE-005',
          'RF-AGE-006',
          'RF-AGE-007',
          'RF-AGE-008',
          'RF-AGE-012',
          'RF-AGE-013',
          'RF-HCL-001',
          'RF-HCL-002',
          'RF-HCL-003',
          'RF-HCL-004',
          'RF-HCL-007',
          'RF-HCL-009',
          'RF-CON-001',
          'RF-CON-003',
          'RF-CON-006',
          'RF-DOC-005',
        ],
      },
    ],
    [
      'paciente',
      {
        codigo: 'ROL-PAC',
        descripcion: 'Rol público sin sesión para solicitud de citas y firma en tablet.',
        permisos: [],
      },
    ],
  ]);

  private static readonly userExtendedMetaStore = new Map<number, UserExtendedMeta>();

  private enrichRoleRow(row: RoleRow): RoleDTO {
    const key = row.nombre_rol.trim().toLowerCase();
    const meta = UserRepository.roleMetadataStore.get(key);
    return {
      id_rol: row.id_rol,
      codigo:
        meta?.codigo ??
        `ROL-${row.nombre_rol
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 4)
          .toUpperCase()}`,
      nombre_rol: row.nombre_rol,
      descripcion: meta?.descripcion ?? 'Rol configurable del sistema OdontoLeal.',
      permisos: meta?.permisos ?? ['RF-AGE-008'],
    };
  }

  // RF-USR-007: Crear rol
  async createRole(
    nombreRol: string,
    metadata?: { codigo: string; descripcion: string; permisos: string[] }
  ): Promise<RoleDTO> {
    const sql = `
      INSERT INTO public.rol (nombre_rol)
      VALUES ($1)
      RETURNING id_rol, nombre_rol;
    `;
    const { rows } = await db.query<RoleRow>(sql, [nombreRol]);
    const created = rows[0];

    if (metadata) {
      UserRepository.roleMetadataStore.set(nombreRol.trim().toLowerCase(), {
        codigo: metadata.codigo,
        descripcion: metadata.descripcion,
        permisos: metadata.permisos,
      });
    }

    return this.enrichRoleRow(created);
  }

  // RF-USR-010: Editar rol
  async updateRole(
    idRol: number,
    data: { nombreRol: string; descripcion: string; permisos: string[] }
  ): Promise<RoleDTO> {
    const prevRole = await this.findRoleById(idRol);
    const sql = `
      UPDATE public.rol
      SET nombre_rol = $1
      WHERE id_rol = $2
      RETURNING id_rol, nombre_rol;
    `;
    const { rows } = await db.query<RoleRow>(sql, [data.nombreRol, idRol]);
    if (rows.length === 0) {
      throw new Error(`El rol con ID ${idRol} no existe.`);
    }

    const codigoActual = prevRole?.codigo ?? 'ROL-GEN';
    if (prevRole) {
      UserRepository.roleMetadataStore.delete(prevRole.nombre_rol.trim().toLowerCase());
    }
    UserRepository.roleMetadataStore.set(data.nombreRol.trim().toLowerCase(), {
      codigo: codigoActual,
      descripcion: data.descripcion,
      permisos: data.permisos,
    });

    return this.enrichRoleRow(rows[0]);
  }

  async findAllRoles(): Promise<RoleDTO[]> {
    const { rows } = await db.query<RoleRow>(
      'SELECT id_rol, nombre_rol FROM public.rol ORDER BY id_rol ASC;'
    );
    return rows.map((r) => this.enrichRoleRow(r));
  }

  async findRoleById(idRol: number): Promise<RoleDTO | null> {
    const { rows } = await db.query<RoleRow>(
      'SELECT id_rol, nombre_rol FROM public.rol WHERE id_rol = $1;',
      [idRol]
    );
    return rows[0] ? this.enrichRoleRow(rows[0]) : null;
  }

  async countUsersByRole(idRol: number): Promise<number> {
    const countRes = await db.query<{ total: string }>(
      'SELECT COUNT(*) AS total FROM public.usuario_rol WHERE id_rol = $1;',
      [idRol]
    );
    return Number(countRes.rows[0]?.total ?? 0);
  }

  // RF-USR-011: Eliminar rol verificando que no tenga usuarios asignados
  async deleteRole(idRol: number): Promise<boolean> {
    const total = await this.countUsersByRole(idRol);
    if (total > 0) {
      throw new Error(
        `No se puede eliminar el rol porque está asignado a ${total} usuario(s).`
      );
    }
    const { rowCount } = await db.query(
      'DELETE FROM public.rol WHERE id_rol = $1;',
      [idRol]
    );
    return (rowCount ?? 0) > 0;
  }

  // RF-USR-001: Crear usuario y asignarle roles en una transacción
  async createUser(dto: CreateUserPersistenceDTO): Promise<UserWithRolesDomainDTO> {
    return db.withTransaction(async (client) => {
      const insertUserSql = `
        INSERT INTO public.usuario (nombre_completo, documento_identidad, correo, telefono, contrasena_hash, estado)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING id_usuario;
      `;
      const userRes = await client.query<{ id_usuario: number }>(insertUserSql, [
        dto.nombreCompleto,
        dto.documentoIdentidad,
        dto.correo,
        dto.telefono || null,
        dto.contrasenaHash,
      ]);
      const idUsuario = userRes.rows[0].id_usuario;

      for (const idRol of dto.rolesIds) {
        await client.query(
          `INSERT INTO public.usuario_rol (id_usuario, id_rol, estado) VALUES ($1, $2, TRUE);`,
          [idUsuario, idRol]
        );
      }

      UserRepository.userExtendedMetaStore.set(idUsuario, {
        esContrasenaTemporal: dto.esContrasenaTemporal ?? true,
        firmaUrl: dto.firmaUrl ?? null,
      });

      const created = await this.findById(idUsuario, client);
      if (!created) throw new Error('Error al recuperar el usuario creado.');
      return created;
    });
  }

  // RF-USR-002: Editar usuario y actualizar sus roles en una transacción
  async updateUser(dto: UpdateUserPersistenceDTO): Promise<UserWithRolesDomainDTO> {
    return db.withTransaction(async (client) => {
      if (dto.contrasenaHash) {
        await client.query(
          `UPDATE public.usuario
           SET nombre_completo = $1,
               documento_identidad = $2,
               correo = $3,
               telefono = $4,
               contrasena_hash = $5
           WHERE id_usuario = $6;`,
          [
            dto.nombreCompleto,
            dto.documentoIdentidad,
            dto.correo,
            dto.telefono || null,
            dto.contrasenaHash,
            dto.idUsuario,
          ]
        );
      } else {
        await client.query(
          `UPDATE public.usuario
           SET nombre_completo = $1,
               documento_identidad = $2,
               correo = $3,
               telefono = $4
           WHERE id_usuario = $5;`,
          [
            dto.nombreCompleto,
            dto.documentoIdentidad,
            dto.correo,
            dto.telefono || null,
            dto.idUsuario,
          ]
        );
      }

      await client.query(`DELETE FROM public.usuario_rol WHERE id_usuario = $1;`, [
        dto.idUsuario,
      ]);

      for (const idRol of dto.rolesIds) {
        await client.query(
          `INSERT INTO public.usuario_rol (id_usuario, id_rol, estado) VALUES ($1, $2, TRUE);`,
          [dto.idUsuario, idRol]
        );
      }

      const prevMeta = UserRepository.userExtendedMetaStore.get(dto.idUsuario);
      UserRepository.userExtendedMetaStore.set(dto.idUsuario, {
        esContrasenaTemporal:
          dto.esContrasenaTemporal ?? prevMeta?.esContrasenaTemporal ?? false,
        firmaUrl:
          dto.firmaUrl !== undefined ? dto.firmaUrl : prevMeta?.firmaUrl ?? null,
      });

      const updated = await this.findById(dto.idUsuario, client);
      if (!updated) throw new Error('Error al recuperar el usuario actualizado.');
      return updated;
    });
  }

  // RF-USR-004: Buscar usuarios con sus roles
  async searchUsers(filters: SearchUsersFilterDTO): Promise<UserWithRolesDomainDTO[]> {
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters.documento) {
      params.push(filters.documento);
      conditions.push(`u.documento_identidad = $${params.length}`);
    }
    if (filters.nombre) {
      params.push(`%${filters.nombre}%`);
      conditions.push(`u.nombre_completo ILIKE $${params.length}`);
    }
    if (filters.estado !== undefined) {
      params.push(filters.estado);
      conditions.push(`u.estado = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        u.id_usuario AS "idUsuario",
        u.nombre_completo AS "nombreCompleto",
        u.documento_identidad AS "documentoIdentidad",
        u.correo,
        u.telefono,
        u.estado,
        COALESCE(
          json_agg(
            json_build_object(
              'idRol', r.id_rol,
              'nombreRol', r.nombre_rol,
              'estadoAsignacion', ur.estado
            )
          ) FILTER (WHERE r.id_rol IS NOT NULL), '[]'
        ) AS roles
      FROM public.usuario u
      LEFT JOIN public.usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN public.rol r ON ur.id_rol = r.id_rol
      ${whereClause}
      GROUP BY u.id_usuario
      ORDER BY u.nombre_completo ASC;
    `;

    const { rows } = await db.query<UserWithRolesDomainDTO>(sql, params);
    return rows.map((user) => this.enrichUserWithMeta(user));
  }

  async findById(
    idUsuario: number,
    customClient?: any
  ): Promise<UserWithRolesDomainDTO | null> {
    const executor = customClient || db;
    const sql = `
      SELECT 
        u.id_usuario AS "idUsuario",
        u.nombre_completo AS "nombreCompleto",
        u.documento_identidad AS "documentoIdentidad",
        u.correo,
        u.telefono,
        u.estado,
        COALESCE(
          json_agg(
            json_build_object(
              'idRol', r.id_rol,
              'nombreRol', r.nombre_rol,
              'estadoAsignacion', ur.estado
            )
          ) FILTER (WHERE r.id_rol IS NOT NULL), '[]'
        ) AS roles
      FROM public.usuario u
      LEFT JOIN public.usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN public.rol r ON ur.id_rol = r.id_rol
      WHERE u.id_usuario = $1
      GROUP BY u.id_usuario;
    `;
    const { rows } = await executor.query(sql, [idUsuario]);
    return rows[0] ? this.enrichUserWithMeta(rows[0]) : null;
  }

  async findByDocument(documentoIdentidad: string): Promise<UserWithRolesDomainDTO | null> {
    const results = await this.searchUsers({ documento: documentoIdentidad });
    return results[0] ?? null;
  }

  async findByEmail(correo: string): Promise<UserWithRolesDomainDTO | null> {
    const all = await this.searchUsers({});
    return (
      all.find((u) => u.correo.trim().toLowerCase() === correo.trim().toLowerCase()) ??
      null
    );
  }

  // RF-USR-005: Obtener credenciales completas para autenticación
  async findAuthCredentialsByEmail(
    correo: string
  ): Promise<UserAuthCredentialsRecord | null> {
    const sql = `
      SELECT 
        u.id_usuario AS "idUsuario",
        u.nombre_completo AS "nombreCompleto",
        u.documento_identidad AS "documentoIdentidad",
        u.correo,
        u.telefono,
        u.contrasena_hash AS "contrasenaHash",
        u.estado,
        COALESCE(
          json_agg(
            json_build_object(
              'idRol', r.id_rol,
              'nombreRol', r.nombre_rol,
              'estadoAsignacion', ur.estado
            )
          ) FILTER (WHERE r.id_rol IS NOT NULL), '[]'
        ) AS roles
      FROM public.usuario u
      LEFT JOIN public.usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN public.rol r ON ur.id_rol = r.id_rol
      WHERE LOWER(u.correo) = LOWER($1)
      GROUP BY u.id_usuario;
    `;
    const { rows } = await db.query<any>(sql, [correo.trim()]);
    if (!rows[0]) return null;

    const enriched = this.enrichUserWithMeta(rows[0]);
    const meta = UserRepository.userExtendedMetaStore.get(enriched.idUsuario);

    return {
      ...enriched,
      contrasenaHash: rows[0].contrasenaHash,
      esContrasenaTemporal: meta?.esContrasenaTemporal ?? false,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    };
  }

  async updatePassword(
    idUsuario: number,
    nuevoHash: string,
    esContrasenaTemporal: boolean
  ): Promise<void> {
    await db.query(
      `UPDATE public.usuario SET contrasena_hash = $1 WHERE id_usuario = $2;`,
      [nuevoHash, idUsuario]
    );
    const prev = UserRepository.userExtendedMetaStore.get(idUsuario);
    UserRepository.userExtendedMetaStore.set(idUsuario, {
      esContrasenaTemporal,
      firmaUrl: prev?.firmaUrl ?? null,
    });
  }

  async findActiveAppointmentsByProfessional(
    idUsuario: number
  ): Promise<ActiveAppointmentSummaryDTO[]> {
    const { rows } = await db.query<{
      id_cita: number;
      titulo: string;
      estado: 'Solicitada' | 'Confirmada' | 'En consulta';
    }>(
      `SELECT id_cita, titulo, estado FROM public.cita 
       WHERE id_usuario = $1 AND estado IN ('Solicitada', 'Confirmada', 'En consulta');`,
      [idUsuario]
    );
    return rows.map((r) => ({
      idCita: r.id_cita,
      titulo: r.titulo,
      estado: r.estado,
    }));
  }

  // RF-USR-003: Activar / Inactivar usuario verificando que no tenga citas activas
  async updateStatus(
    idUsuario: number,
    nuevoEstado: boolean
  ): Promise<UserWithRolesDomainDTO | null> {
    if (!nuevoEstado) {
      const activeAppointments =
        await this.findActiveAppointmentsByProfessional(idUsuario);
      if (activeAppointments.length > 0) {
        throw new Error(
          `No se puede inactivar al profesional porque tiene ${activeAppointments.length} cita(s) pendiente(s) por atender.`
        );
      }
    }

    await db.query(
      `UPDATE public.usuario SET estado = $1 WHERE id_usuario = $2;`,
      [nuevoEstado, idUsuario]
    );
    return this.findById(idUsuario);
  }

  private enrichUserWithMeta(user: UserWithRolesDomainDTO): UserWithRolesDomainDTO {
    const userMeta = UserRepository.userExtendedMetaStore.get(user.idUsuario);
    const enrichedRoles = (user.roles ?? []).map((r) => {
      const roleMeta = UserRepository.roleMetadataStore.get(
        r.nombreRol.trim().toLowerCase()
      );
      return {
        ...r,
        codigo: roleMeta?.codigo,
        descripcion: roleMeta?.descripcion,
        permisos: roleMeta?.permisos ?? ['RF-AGE-008'],
      };
    });

    return {
      ...user,
      esContrasenaTemporal: userMeta?.esContrasenaTemporal ?? false,
      firmaUrl: userMeta?.firmaUrl ?? null,
      roles: enrichedRoles,
    };
  }
}