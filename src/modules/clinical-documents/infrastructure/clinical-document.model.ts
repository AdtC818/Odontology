export type TipoDocumentoClinico = 'ORDEN_MEDICAMENTOS' | 'INCAPACIDAD' | 'REMISION';

export interface CreateClinicalDocumentDTO {
  idPaciente: number;
  idCita: number;
  tipoDocumento: TipoDocumentoClinico;
  archivoPdfUrl: string;
  modoFirma: 'CON_FIRMA_REGISTRADA' | 'FIRMA_MANUSCRITA';
  detalles: {
    // Para ORDEN_MEDICAMENTOS (RF-DOC-001)
    medicamentos?: {
      nombrePresentacion: string;
      dosis: string;
      frecuencia: string;
      duracion: string;
    }[];
    indicacionesAdicionales?: string;
    // Para INCAPACIDAD (RF-DOC-002)
    diasIncapacidad?: number;
    motivoIncapacidad?: string;
    // Para REMISION (RF-DOC-003)
    especialidadDestino?: string;
    motivoRemision?: string;
  };
  diligenciadoPor: {
    idUsuario: number;
    nombreProfesional: string;
  };
}