import fs from 'fs';
import path from 'path';
import { RoleDefinition } from '../domain/role.entity';

export interface UserExtraMetadata {
  mustChangePassword: boolean;
  firmaBase64?: string;
  draftForm?: { formId: string; data: any; savedAt: string } | null;
}

export interface LoginAttemptRecord {
  failedCount: number;
  lockedUntilISO: string | null;
}

export interface RecoveryTokenRecord {
  token: string;
  correo: string;
  expiresAtISO: string;
  used: boolean;
}

interface RbacStoreSchema {
  roles: Record<string, RoleDefinition>;
  userMetadata: Record<number, UserExtraMetadata>;
  loginAttempts: Record<string, LoginAttemptRecord>;
  recoveryTokens: Record<string, RecoveryTokenRecord>;
}

const STORE_PATH = path.resolve(process.cwd(), 'src/app/config/rbac-store.json');

const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  'ROL-PAC': {
    codigo: 'ROL-PAC',
    nombre: 'Paciente',
    descripcion: 'Persona natural que solicita atención odontológica sin cuenta.',
    permisos: [],
    esInicial: true,
  },
  'ROL-ODO': {
    codigo: 'ROL-ODO',
    nombre: 'Odontólogo General / Gerente',
    descripcion: 'Atiende Odontología general, gestiona su agenda, historia clínica y documentos.',
    permisos: [
      'RF-AGE-008', 'RF-AGE-009', 'RF-AGE-013',
      'RF-HCL-001', 'RF-HCL-002', 'RF-HCL-003', 'RF-HCL-004',
      'RF-HCL-005', 'RF-HCL-006', 'RF-HCL-007', 'RF-HCL-008', 'RF-HCL-009',
      'RF-CON-001', 'RF-CON-003', 'RF-CON-006',
      'RF-DOC-001', 'RF-DOC-002', 'RF-DOC-003', 'RF-DOC-004', 'RF-DOC-005',
    ],
    esInicial: true,
  },
  'ROL-ESP': {
    codigo: 'ROL-ESP',
    nombre: 'Especialista en Ortodoncia',
    descripcion: 'Atiende Ortodoncia y diligencia historias clínicas de sus consultas.',
    permisos: [
      'RF-AGE-008', 'RF-AGE-009', 'RF-AGE-013',
      'RF-HCL-001', 'RF-HCL-002', 'RF-HCL-003', 'RF-HCL-004',
      'RF-HCL-005', 'RF-HCL-006', 'RF-HCL-007', 'RF-HCL-008', 'RF-HCL-009',
      'RF-CON-001', 'RF-CON-003', 'RF-CON-006',
      'RF-DOC-001', 'RF-DOC-002', 'RF-DOC-003', 'RF-DOC-004', 'RF-DOC-005',
    ],
    esInicial: true,
  },
  'ROL-COA': {
    codigo: 'ROL-COA',
    nombre: 'Coordinadora de Agendamiento',
    descripcion: 'Gestiona la agenda de todos los profesionales, solicitudes y datos de pacientes.',
    permisos: [
      'RF-AGE-001', 'RF-AGE-002', 'RF-AGE-005', 'RF-AGE-006', 'RF-AGE-007', 'RF-AGE-008', 'RF-AGE-012', 'RF-AGE-013',
      'RF-HCL-001', 'RF-HCL-002', 'RF-HCL-003', 'RF-HCL-004', 'RF-HCL-010',
    ],
    esInicial: true,
  },
  'ROL-AUX': {
    codigo: 'ROL-AUX',
    nombre: 'Auxiliar de Odontología',
    descripcion: 'Apoya en agendamiento y asiste al profesional durante una cita En consulta.',
    permisos: [
      'RF-AGE-001', 'RF-AGE-002', 'RF-AGE-005', 'RF-AGE-006', 'RF-AGE-007', 'RF-AGE-008', 'RF-AGE-012', 'RF-AGE-013',
      'RF-HCL-001', 'RF-HCL-002', 'RF-HCL-003', 'RF-HCL-004',
      'RF-HCL-005', 'RF-HCL-007', 'RF-HCL-009', 'RF-CON-001', 'RF-CON-003', 'RF-CON-006', 'RF-DOC-005',
    ],
    esInicial: true,
  },
  'ROL-ADM': {
    codigo: 'ROL-ADM',
    nombre: 'Administrador del Sistema',
    descripcion: 'Gestiona usuarios, roles, permisos, plantillas de consentimiento y agenda.',
    permisos: [
      'RF-USR-001', 'RF-USR-002', 'RF-USR-003', 'RF-USR-004', 'RF-USR-007', 'RF-USR-010', 'RF-USR-011',
      'RF-CON-004', 'RF-CON-007', 'RF-CON-008',
      'RF-AGE-001', 'RF-AGE-002', 'RF-AGE-005', 'RF-AGE-006', 'RF-AGE-007', 'RF-AGE-008', 'RF-AGE-012', 'RF-AGE-013',
      'RF-HCL-001', 'RF-HCL-002', 'RF-HCL-003', 'RF-HCL-004', 'RF-HCL-010',
    ],
    esInicial: true,
  },
};

export class JsonMetadataStore {
  private static ensureFile(): RbacStoreSchema {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      const initial: RbacStoreSchema = {
        roles: DEFAULT_ROLES,
        userMetadata: {},
        loginAttempts: {},
        recoveryTokens: {},
      };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as RbacStoreSchema;
  }

  static read(): RbacStoreSchema {
    return this.ensureFile();
  }

  static write(data: RbacStoreSchema): void {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }
}