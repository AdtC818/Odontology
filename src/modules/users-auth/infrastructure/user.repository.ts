import { db } from '../../../shared/infrastructure/database/database';
import { CreateUserDTO, RoleRow, UserWithRolesDTO } from './user.model';

export class UserRepository {
  // RF-USR-007: Crear rol
  async createRole(nombreRol: string): Promise<RoleRow> {
    const sql = `
      INSERT INTO public.rol (nombre_rol)
      VALUES ($1)
      RETURNING id_rol, nombre_rol;
    `;
    const { rows } = await db.query<RoleRow>(sql, [nombreRol]);
    return rows[0];
  }

  async findAllRoles(): Promise<RoleRow[]> {
    const { rows } = await db.query<RoleRow>('SELECT id_rol, nombre_rol FROM public.rol ORDER BY id_rol ASC;');
    return rows;
  }

  // RF-USR-011: Eliminar rol verificando que no tenga usuarios asignados
  async deleteRole(idRol: number): Promise<boolean> {
    const countRes = await db.query<{ total: string }>(
      'SELECT COUNT(*) AS total FROM public.usuario_rol WHERE id_rol = $1;',
      [idRol]
    );
    if (Number(countRes.rows[0].total) > 0) {
      throw new Error(`No se puede eliminar el rol porque está asignado a ${countRes.rows[0].total} usuario(s).`);
    }
    const { rowCount } = await db.query('DELETE FROM public.rol WHERE id_rol = $1;', [idRol]);
    return (rowCount ?? 0) > 0;
  }

  // RF-USR-001: Crear usuario y asignarle roles en una transacción
  async createUser(dto: CreateUserDTO): Promise<UserWithRolesDTO> {
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

      const created = await this.findById(idUsuario, client);
      if (!created) throw new Error('Error al recuperar el usuario creado.');
      return created;
    });
  }

  // RF-USR-004: Buscar usuarios con sus roles
  async searchUsers(filters: { documento?: string; nombre?: string; estado?: boolean }): Promise<UserWithRolesDTO[]> {
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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

    const { rows } = await db.query<UserWithRolesDTO>(sql, params);
    return rows;
  }

  async findById(idUsuario: number, customClient?: any): Promise<UserWithRolesDTO | null> {
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
    return rows[0] || null;
  }

  // RF-USR-003: Activar / Inactivar usuario verificando que no tenga citas activas
  async updateStatus(idUsuario: number, nuevoEstado: boolean): Promise<UserWithRolesDTO | null> {
    if (!nuevoEstado) {
      const activeAppointments = await db.query(
        `SELECT id_cita, titulo, estado FROM public.cita 
         WHERE id_usuario = $1 AND estado IN ('Solicitada', 'Confirmada', 'En consulta');`,
        [idUsuario]
      );
      if (activeAppointments.rows.length > 0) {
        throw new Error(
          `No se puede inactivar al profesional porque tiene ${activeAppointments.rows.length} cita(s) pendiente(s) por atender.`
        );
      }
    }

    await db.query(`UPDATE public.usuario SET estado = $1 WHERE id_usuario = $2;`, [nuevoEstado, idUsuario]);
    return this.findById(idUsuario);
  }
}