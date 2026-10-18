import bcrypt from 'bcryptjs';
import { db } from '../../../shared/infrastructure/database/database';
import { RoleDefinition } from '../domain/role.entity';
import { ActiveAppointmentSummary, IUserRepository, UserDomainDTO } from '../domain/user.repository.interface';
import { JsonMetadataStore } from './json-metadata.store';

export class UserRepository implements IUserRepository {
  // Inicializa los 6 roles base y el usuario Dr. Eduar Leal (ROL-ADM + ROL-ODO)
  async ensureInitialSeed(): Promise<void> {
    const store = JsonMetadataStore.read();

    for (const codigo of Object.keys(store.roles)) {
      await db.query(
        `INSERT INTO public.rol (nombre_rol) VALUES ($1) ON CONFLICT (nombre_rol) DO NOTHING;`,
        [codigo]
      );
    }

    // Crear usuario inicial Dr. Eduar Leal si no existe ningún usuario
    const existingAdmin = await db.query(
      `SELECT id_usuario FROM public.usuario WHERE correo = 'eduard.leal@gmail.com';`
    );

    if (existingAdmin.rows.length === 0) {
      const hash = await bcrypt.hash('PasswordSegura123', 10);
      const rolesRes = await db.query<{ id_rol: number; nombre_rol: string }>(
        `SELECT id_rol, nombre_rol FROM public.rol WHERE nombre_rol IN ('ROL-ADM', 'ROL-ODO');`
      );
      const userRes = await db.query<{ id_usuario: number }>(
        `INSERT INTO public.usuario (nombre_completo, documento_identidad, correo, telefono, contrasena_hash, estado)
         VALUES ('Dr. Eduar Leal Álvarez', '1098765432', 'eduard.leal@gmail.com', '3101234567', $1, TRUE)
         ON CONFLICT (documento_identidad) DO NOTHING
         RETURNING id_usuario;`,
        [hash]
      );

      if (userRes.rows.length > 0) {
        const idUsuario = userRes.rows[0].id_usuario;
        for (const r of rolesRes.rows) {
          await db.query(
            `INSERT INTO public.usuario_rol (id_usuario, id_rol, estado) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING;`,
            [idUsuario, r.id_rol]
          );
        }
        store.userMetadata[idUsuario] = { mustChangePassword: false };
        JsonMetadataStore.write(store);
      }
    }
  }

  private mapUserWithMetadata(row: any): UserDomainDTO {
    const store = JsonMetadataStore.read();
    const meta = store.userMetadata[row.idUsuario] || { mustChangePassword: false };
    const rolesAsignados: { idRol: number; codigo: string; nombre: string }[] = (row.roles || []).map((r: any) => ({
      idRol: r.idRol,
      codigo: r.nombreRol,
      nombre: store.roles[r.nombreRol]?.nombre || r.nombreRol,
    }));

    const permisosSet = new Set<string>();
    for (const r of rolesAsignados) {
      const roleDef = store.roles[r.codigo];
      if (roleDef) {
        roleDef.permisos.forEach((p) => permisosSet.add(p));
      }
    }

    return {
      idUsuario: row.idUsuario,
      nombreCompleto: row.nombreCompleto,
      documentoIdentidad: row.documentoIdentidad,
      correo: row.correo,
      telefono: row.telefono,
      contrasenaHash: row.contrasenaHash,
      estado: row.estado,
      mustChangePassword: Boolean(meta.mustChangePassword),
      firmaBase64: meta.firmaBase64,
      roles: rolesAsignados,
      permisosConsolidados: Array.from(permisosSet),
    };
  }

  async getAllRoles(): Promise<(RoleDefinition & { idRol: number; usuariosAsignados: number })[]> {
    const store = JsonMetadataStore.read();
    const sql = `
      SELECT r.id_rol, r.nombre_rol, COUNT(ur.id_usuario)::int AS total_usuarios
      FROM public.rol r
      LEFT JOIN public.usuario_rol ur ON r.id_rol = ur.id_rol
      GROUP BY r.id_rol
      ORDER BY r.id_rol ASC;
    `;
    const { rows } = await db.query(sql);

    return rows.map((row) => {
      const def = store.roles[row.nombre_rol] || {
        codigo: row.nombre_rol,
        nombre: row.nombre_rol,
        descripcion: 'Rol personalizado',
        permisos: [],
        esInicial: false,
      };
      return {
        ...def,
        idRol: row.id_rol,
        usuariosAsignados: row.total_usuarios,
      };
    });
  }

  async createRole(role: RoleDefinition): Promise<RoleDefinition & { idRol: number }> {
    const store = JsonMetadataStore.read();
    const existsByName = Object.values(store.roles).some(
      (r) =>
        r.codigo.toLowerCase() === role.codigo.toLowerCase() ||
        r.nombre.toLowerCase() === role.nombre.toLowerCase()
    );
    if (existsByName) {
      throw new Error('El código o nombre del rol ya se encuentra registrado (RF-USR-007).');
    }

    const { rows } = await db.query<{ id_rol: number }>(
      `INSERT INTO public.rol (nombre_rol) VALUES ($1) RETURNING id_rol;`,
      [role.codigo]
    );

    store.roles[role.codigo] = role;
    JsonMetadataStore.write(store);

    return { ...role, idRol: rows[0].id_rol };
  }

  async updateRole(codigo: string, nombre: string, descripcion: string, permisos: string[]): Promise<RoleDefinition> {
    const store = JsonMetadataStore.read();
    const existing = store.roles[codigo];
    if (!existing) throw new Error('El rol seleccionado no existe.');

    const duplicateName = Object.values(store.roles).some(
      (r) => r.codigo !== codigo && r.nombre.toLowerCase() === nombre.trim().toLowerCase()
    );
    if (duplicateName) {
      throw new Error('Ya existe otro rol con ese mismo nombre (RF-USR-010).');
    }

    existing.nombre = nombre.trim();
    existing.descripcion = descripcion.trim();
    existing.permisos = permisos;
    JsonMetadataStore.write(store);
    return existing;
  }

  async deleteRole(codigo: string): Promise<void> {
    const store = JsonMetadataStore.read();
    const existing = store.roles[codigo];
    if (!existing) throw new Error('El rol no existe.');
    if (existing.esInicial) {
      throw new Error(`El rol ${codigo} pertenece a la configuración inicial del sistema y no se puede eliminar (RF-USR-011).`);
    }

    const roleRow = await db.query<{ id_rol: number }>(`SELECT id_rol FROM public.rol WHERE nombre_rol = $1;`, [codigo]);
    if (roleRow.rows.length > 0) {
      const idRol = roleRow.rows[0].id_rol;
      const countRes = await db.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM public.usuario_rol WHERE id_rol = $1;`,
        [idRol]
      );
      if (countRes.rows[0].total > 0) {
        throw new Error(
          `No se puede eliminar el rol porque está asignado a ${countRes.rows[0].total} usuario(s) (RF-USR-011).`
        );
      }
      await db.query(`DELETE FROM public.rol WHERE id_rol = $1;`, [idRol]);
    }

    delete store.roles[codigo];
    JsonMetadataStore.write(store);
  }

  async findByEmail(correo: string): Promise<UserDomainDTO | null> {
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
            json_build_object('idRol', r.id_rol, 'nombreRol', r.nombre_rol)
          ) FILTER (WHERE r.id_rol IS NOT NULL AND ur.estado = TRUE), '[]'
        ) AS roles
      FROM public.usuario u
      LEFT JOIN public.usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN public.rol r ON ur.id_rol = r.id_rol
      WHERE LOWER(u.correo) = LOWER($1)
      GROUP BY u.id_usuario;
    `;
    const { rows } = await db.query(sql, [correo.trim()]);
    return rows.length > 0 ? this.mapUserWithMetadata(rows[0]) : null;
  }

  async findById(idUsuario: number): Promise<UserDomainDTO | null> {
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
            json_build_object('idRol', r.id_rol, 'nombreRol', r.nombre_rol)
          ) FILTER (WHERE r.id_rol IS NOT NULL AND ur.estado = TRUE), '[]'
        ) AS roles
      FROM public.usuario u
      LEFT JOIN public.usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN public.rol r ON ur.id_rol = r.id_rol
      WHERE u.id_usuario = $1
      GROUP BY u.id_usuario;
    `;
    const { rows } = await db.query(sql, [idUsuario]);
    return rows.length > 0 ? this.mapUserWithMetadata(rows[0]) : null;
  }

  // RF-USR-004: Buscar usuarios (exacto por documento, sin tildes ni mayúsculas por nombre, combinable con rol y estado)
  async searchUsers(filters: {
    documento?: string;
    nombre?: string;
    rolCodigo?: string;
    estado?: boolean;
  }): Promise<UserDomainDTO[]> {
    const allSql = `
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
            json_build_object('idRol', r.id_rol, 'nombreRol', r.nombre_rol)
          ) FILTER (WHERE r.id_rol IS NOT NULL AND ur.estado = TRUE), '[]'
        ) AS roles
      FROM public.usuario u
      LEFT JOIN public.usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN public.rol r ON ur.id_rol = r.id_rol
      GROUP BY u.id_usuario
      ORDER BY u.nombre_completo ASC;
    `;
    const { rows } = await db.query(allSql);
    const mapped = rows.map((r) => this.mapUserWithMetadata(r));

    const normalize = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    return mapped.filter((u) => {
      if (filters.documento && u.documentoIdentidad !== filters.documento.trim()) return false;
      if (filters.nombre && !normalize(u.nombreCompleto).includes(normalize(filters.nombre.trim()))) return false;
      if (filters.estado !== undefined && u.estado !== filters.estado) return false;
      if (filters.rolCodigo && !u.roles.some((r) => r.codigo === filters.rolCodigo)) return false;
      return true;
    });
  }

  async createUser(data: {
    nombreCompleto: string;
    documentoIdentidad: string;
    correo: string;
    telefono: string;
    contrasenaHash: string;
    rolesCodigos: string[];
    firmaBase64?: string;
    mustChangePassword: boolean;
  }): Promise<UserDomainDTO> {
    // Verificar duplicados para dar mensaje con propietario (RF-USR-001 / RF-USR-002)
    const dupCheck = await db.query<{ nombre_completo: string; documento_identidad: string; correo: string }>(
      `SELECT nombre_completo, documento_identidad, correo FROM public.usuario 
       WHERE documento_identidad = $1 OR LOWER(correo) = LOWER($2);`,
      [data.documentoIdentidad, data.correo]
    );
    if (dupCheck.rows.length > 0) {
      const owner = dupCheck.rows[0];
      throw new Error(
        `El documento o correo ya pertenece al usuario ${owner.nombre_completo} (Doc: ${owner.documento_identidad}).`
      );
    }

    const idUsuario = await db.withTransaction(async (client) => {
      const insertUser = await client.query<{ id_usuario: number }>(
        `INSERT INTO public.usuario (nombre_completo, documento_identidad, correo, telefono, contrasena_hash, estado)
         VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id_usuario;`,
        [data.nombreCompleto.trim(), data.documentoIdentidad.trim(), data.correo.trim(), data.telefono.trim(), data.contrasenaHash]
      );
      const newId = insertUser.rows[0].id_usuario;

      const rolesRes = await client.query<{ id_rol: number }>(
        `SELECT id_rol FROM public.rol WHERE nombre_rol = ANY($1::varchar[]);`,
        [data.rolesCodigos]
      );

      for (const r of rolesRes.rows) {
        await client.query(`INSERT INTO public.usuario_rol (id_usuario, id_rol, estado) VALUES ($1, $2, TRUE);`, [
          newId,
          r.id_rol,
        ]);
      }
      return newId;
    });

    const store = JsonMetadataStore.read();
    store.userMetadata[idUsuario] = {
      mustChangePassword: data.mustChangePassword,
      firmaBase64: data.firmaBase64,
    };
    JsonMetadataStore.write(store);

    const created = await this.findById(idUsuario);
    if (!created) throw new Error('Error al recuperar el usuario creado.');
    return created;
  }

  async updateUser(
    idUsuario: number,
    data: {
      nombreCompleto: string;
      documentoIdentidad: string;
      correo: string;
      telefono: string;
      contrasenaHash?: string;
      rolesCodigos: string[];
      firmaBase64?: string;
      mustChangePassword?: boolean;
    }
  ): Promise<UserDomainDTO> {
    const dupCheck = await db.query<{ nombre_completo: string; documento_identidad: string }>(
      `SELECT nombre_completo, documento_identidad FROM public.usuario 
       WHERE id_usuario <> $1 AND (documento_identidad = $2 OR LOWER(correo) = LOWER($3));`,
      [idUsuario, data.documentoIdentidad, data.correo]
    );
    if (dupCheck.rows.length > 0) {
      const owner = dupCheck.rows[0];
      throw new Error(
        `El documento o correo ya pertenece al usuario ${owner.nombre_completo} (Doc: ${owner.documento_identidad}) (RF-USR-002).`
      );
    }

    await db.withTransaction(async (client) => {
      if (data.contrasenaHash) {
        await client.query(
          `UPDATE public.usuario 
           SET nombre_completo = $1, documento_identidad = $2, correo = $3, telefono = $4, contrasena_hash = $5
           WHERE id_usuario = $6;`,
          [data.nombreCompleto, data.documentoIdentidad, data.correo, data.telefono, data.contrasenaHash, idUsuario]
        );
      } else {
        await client.query(
          `UPDATE public.usuario 
           SET nombre_completo = $1, documento_identidad = $2, correo = $3, telefono = $4
           WHERE id_usuario = $5;`,
          [data.nombreCompleto, data.documentoIdentidad, data.correo, data.telefono, idUsuario]
        );
      }

      await client.query(`DELETE FROM public.usuario_rol WHERE id_usuario = $1;`, [idUsuario]);
      const rolesRes = await client.query<{ id_rol: number }>(
        `SELECT id_rol FROM public.rol WHERE nombre_rol = ANY($1::varchar[]);`,
        [data.rolesCodigos]
      );
      for (const r of rolesRes.rows) {
        await client.query(`INSERT INTO public.usuario_rol (id_usuario, id_rol, estado) VALUES ($1, $2, TRUE);`, [
          idUsuario,
          r.id_rol,
        ]);
      }
    });

    const store = JsonMetadataStore.read();
    const prevMeta = store.userMetadata[idUsuario] || { mustChangePassword: false };
    store.userMetadata[idUsuario] = {
      ...prevMeta,
      mustChangePassword: data.mustChangePassword ?? prevMeta.mustChangePassword,
      firmaBase64: data.firmaBase64 !== undefined ? data.firmaBase64 : prevMeta.firmaBase64,
    };
    JsonMetadataStore.write(store);

    const updated = await this.findById(idUsuario);
    if (!updated) throw new Error('Usuario no encontrado.');
    return updated;
  }

  async updateUserStatus(idUsuario: number, estado: boolean): Promise<UserDomainDTO> {
    await db.query(`UPDATE public.usuario SET estado = $1 WHERE id_usuario = $2;`, [estado, idUsuario]);
    const updated = await this.findById(idUsuario);
    if (!updated) throw new Error('Usuario no encontrado.');
    return updated;
  }

  async updatePassword(idUsuario: number, newHash: string, isTemporary: boolean): Promise<void> {
    await db.query(`UPDATE public.usuario SET contrasena_hash = $1 WHERE id_usuario = $2;`, [newHash, idUsuario]);
    const store = JsonMetadataStore.read();
    store.userMetadata[idUsuario] = {
      ...(store.userMetadata[idUsuario] || {}),
      mustChangePassword: isTemporary,
    };
    JsonMetadataStore.write(store);
  }

  async countActiveAdminsExcluding(excludeUserId?: number): Promise<number> {
    const sql = `
      SELECT COUNT(DISTINCT u.id_usuario)::int AS total
      FROM public.usuario u
      INNER JOIN public.usuario_rol ur ON u.id_usuario = ur.id_usuario AND ur.estado = TRUE
      INNER JOIN public.rol r ON ur.id_rol = r.id_rol
      WHERE u.estado = TRUE AND r.nombre_rol = 'ROL-ADM'
      ${excludeUserId ? 'AND u.id_usuario <> $1' : ''};
    `;
    const { rows } = await db.query<{ total: number }>(sql, excludeUserId ? [excludeUserId] : []);
    return rows[0].total;
  }

  async getActiveAppointmentsForProfessional(idUsuario: number): Promise<ActiveAppointmentSummary[]> {
    const sql = `
      SELECT id_cita AS "idCita", titulo, estado
      FROM public.cita
      WHERE id_usuario = $1 AND estado IN ('Solicitada', 'Confirmada', 'En consulta');
    `;
    const { rows } = await db.query<ActiveAppointmentSummary>(sql, [idUsuario]);
    return rows;
  }
}