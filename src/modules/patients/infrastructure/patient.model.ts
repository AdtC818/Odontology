export interface PatientRow {
  id_paciente: number;
  nombre_completo: string;
  documento_identidad: string;
  correo: string | null;
  telefono: string | null;
  fecha_nacimiento: string;
  sexo: string | null;
}

export interface CreatePatientDTO {
  nombreCompleto: string;
  documentoIdentidad: string;
  correo?: string;
  telefono?: string;
  fechaNacimiento: string; // YYYY-MM-DD
  sexo?: string;           // 'Femenino' | 'Masculino' | 'Indeterminado' | null (Datos incompletos)
}