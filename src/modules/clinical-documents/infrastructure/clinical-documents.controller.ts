import { Request, Response } from 'express';
import { ClinicalDocumentRepository } from './clinical-document.repository';

export class ClinicalDocumentsController {
  constructor(private readonly docRepo: ClinicalDocumentRepository) {}

  generateDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idPaciente, idCita, tipoDocumento, archivoPdfUrl, modoFirma, detalles, diligenciadoPor } = req.body;
      if (tipoDocumento === 'INCAPACIDAD') {
        const dias = detalles?.diasIncapacidad;
        if (!dias || dias < 1 || dias > 30) {
          res.status(400).json({ message: 'Los días de incapacidad deben ser un entero entre 1 y 30.' });
          return;
        }
      }
      const doc = await this.docRepo.createClinicalDocument({
        idPaciente,
        idCita,
        tipoDocumento,
        archivoPdfUrl,
        modoFirma: modoFirma || 'CON_FIRMA_REGISTRADA',
        detalles,
        diligenciadoPor,
      });
      res.status(201).json({ message: `Documento (${tipoDocumento}) generado exitosamente.`, data: doc });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getPatientDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const idPaciente = Number(req.params.idPaciente);
      const docs = await this.docRepo.getDocumentsByPatient(idPaciente);
      if (docs.length === 0) {
        res.status(404).json({ message: 'El paciente no tiene documentos clínicos registrados', data: [] });
        return;
      }
      res.json({ data: docs });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}