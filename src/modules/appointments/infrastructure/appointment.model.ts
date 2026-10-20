export type EstadoCita =
  | 'Solicitada'
  | 'Confirmada'
  | 'Rechazada'
  | 'En consulta'
  | 'Atendida'
  | 'Cancelada'
  | 'Inasistencia';

export interface TimeSlotRow {
  inicio: string;
  final: string;
  estado: boolean;
  ocupacion: boolean;
}

export interface CreateSolicitudCitaDTO {
  nombreSolicitante: string;
  documentoSolicitante: string;
  correoSolicitante: string;
  telefonoSolicitante?: string;
  fechaNacimiento?: string;
  bloqueSolicitado: string; 
  descripcion?: string;
  idProfesional?: number;
  servicio?: string;
  autorizacionDatos?: boolean;
}

export interface CreateCitaDTO {
  titulo: string;
  descripcion?: string;
  idPaciente: number;
  idUsuarioProfesional: number;
  idUsuarioGestor: number; 
  bloques: string[];       
}