import { RoleDefinition } from './role.entity';

export interface UserDomainDTO {
  idUsuario: number;
  nombreCompleto: string;
  documentoIdentidad: string;
  correo: string;
  telefono: string | null;
  contrasenaHash: string;
  estado: boolean;
  mustChangePassword: boolean;
  firmaBase64?: string;
  roles: { idRol: number; codigo: string; nombre: string }[];
  permisosConsolidados: string[];
}

export interface ActiveAppointmentSummary {
  idCita: number;
  titulo: string;
  estado: string;
}

export interface IUserRepository {
  ensureInitialSeed(): Promise<void>;
  getAllRoles(): Promise<(RoleDefinition & { idRol: number; usuariosAsignados: number })[]>;
  createRole(role: RoleDefinition): Promise<RoleDefinition & { idRol: number }>;
  updateRole(codigo: string, nombre: string, descripcion: string, permisos: string[]): Promise<RoleDefinition>;
  deleteRole(codigo: string): Promise<void>;
  findByEmail(correo: string): Promise<UserDomainDTO | null>;
  findById(idUsuario: number): Promise<UserDomainDTO | null>;
  searchUsers(filters: { documento?: string; nombre?: string; rolCodigo?: string; estado?: boolean }): Promise<UserDomainDTO[]>;
  createUser(data: {
    nombreCompleto: string;
    documentoIdentidad: string;
    correo: string;
    telefono: string;
    contrasenaHash: string;
    rolesCodigos: string[];
    firmaBase64?: string;
    mustChangePassword: boolean;
  }): Promise<UserDomainDTO>;
  updateUser(
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
  ): Promise<UserDomainDTO>;
  updateUserStatus(idUsuario: number, estado: boolean): Promise<UserDomainDTO>;
  updatePassword(idUsuario: number, newHash: string, isTemporary: boolean): Promise<void>;
  countActiveAdminsExcluding(excludeUserId?: number): Promise<number>;
  getActiveAppointmentsForProfessional(idUsuario: number): Promise<ActiveAppointmentSummary[]>;
}