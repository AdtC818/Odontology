export const INITIAL_PROTECTED_ROLES = [
  'ROL-PAC',
  'ROL-ODO',
  'ROL-ESP',
  'ROL-COA',
  'ROL-AUX',
  'ROL-ADM',
] as const;

// Permisos clínicos que no pueden asignarse a roles nuevos ni modificarse (RF-USR-007, RF-USR-010)
export const CLINICAL_RESTRICTED_PERMISSIONS = [
  'RF-HCL-005',
  'RF-HCL-006',
  'RF-HCL-007',
  'RF-HCL-008',
  'RF-HCL-009',
  'RF-CON-001',
  'RF-CON-003',
  'RF-CON-006',
  'RF-DOC-001',
  'RF-DOC-002',
  'RF-DOC-003',
  'RF-DOC-004',
  'RF-DOC-005',
];

// Permisos de administración que no se pueden quitar a ROL-ADM (RF-USR-010)
export const ADMIN_REQUIRED_PERMISSIONS = [
  'RF-USR-001',
  'RF-USR-002',
  'RF-USR-003',
  'RF-USR-004',
  'RF-USR-007',
  'RF-USR-010',
  'RF-USR-011',
];

export interface RoleDefinition {
  idRol?: number;
  codigo: string;       // Ej: ROL-ADM
  nombre: string;       // Ej: Administrador del Sistema
  descripcion: string;
  permisos: string[];   // Códigos de RF permitidos
  esInicial: boolean;
}

export class RoleValidator {
  // RF-USR-007: Validar creación de rol nuevo
  static validateNewRole(codigo: string, nombre: string, permisos: string[]): void {
    if (!codigo?.trim() || !nombre?.trim()) {
      throw new Error('El código y el nombre del rol son obligatorios.');
    }
    if (!permisos || permisos.length === 0) {
      throw new Error('Debe seleccionar al menos un permiso para el rol.');
    }
    const hasClinical = permisos.some((p) => CLINICAL_RESTRICTED_PERMISSIONS.includes(p));
    if (hasClinical) {
      throw new Error(
        'No se permite asignar permisos clínicos (RF-HCL-005 a 009, RF-CON-001/003/006, RF-DOC-001 a 005) a un nuevo rol (RF-USR-007).'
      );
    }
  }

  // RF-USR-010: Validar edición de rol existente
  static validateEditRole(existing: RoleDefinition, nuevoNombre: string, nuevosPermisos: string[]): void {
    if (!nuevoNombre?.trim()) {
      throw new Error('El nombre del rol no puede quedar vacío.');
    }
    if (existing.codigo === 'ROL-PAC' && nuevosPermisos.length > 0) {
      throw new Error('No se pueden asignar permisos internos a ROL-PAC (RF-USR-010).');
    }
    if (existing.codigo !== 'ROL-PAC' && (!nuevosPermisos || nuevosPermisos.length === 0)) {
      throw new Error('El rol no puede quedar sin permisos.');
    }
    if (existing.codigo === 'ROL-ADM') {
      const missingAdminPerm = ADMIN_REQUIRED_PERMISSIONS.some((p) => !nuevosPermisos.includes(p));
      if (missingAdminPerm) {
        throw new Error('No se pueden quitar a ROL-ADM los permisos de administración de usuarios y roles (RF-USR-010).');
      }
    }

    // Verificar que los permisos clínicos de cualquier rol no hayan cambiado respecto a su estado original
    const prevClinical = existing.permisos.filter((p) => CLINICAL_RESTRICTED_PERMISSIONS.includes(p)).sort();
    const nextClinical = nuevosPermisos.filter((p) => CLINICAL_RESTRICTED_PERMISSIONS.includes(p)).sort();
    if (JSON.stringify(prevClinical) !== JSON.stringify(nextClinical)) {
      throw new Error('Los permisos clínicos son fijos según la sección 2.2 y no pueden modificarse (RF-USR-010).');
    }
  }
}