import { Request, Response } from 'express';
import { ConsentRepository } from './consent.repository';

export class ConsentsController {
  constructor(private readonly consentRepo: ConsentRepository) {}

  createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, plantillaUrl, tipoConsentimiento } = req.body;
      const created = await this.consentRepo.createTemplate({
        nombre,
        plantillaUrl,
        tipoConsentimiento: Boolean(tipoConsentimiento),
      });
      res.status(201).json({ message: 'Plantilla creada en versión 1.', data: created });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updateTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const updated = await this.consentRepo.updateTemplateVersion(id, req.body);
      res.json({ message: 'Nueva versión de plantilla generada.', data: updated });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  toggleStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const { estado } = req.body;
      const updated = await this.consentRepo.toggleTemplateStatus(id, Boolean(estado));
      res.json({ message: 'Estado de plantilla actualizado.', data: updated });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const onlyActive = req.query.activas === 'true';
      const templates = await this.consentRepo.findAllTemplates(onlyActive);
      res.json({ data: templates });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  signConsent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idConsentimiento, idPaciente, idCita, archivoUrl } = req.body;
      const signed = await this.consentRepo.recordSignedConsent({
        idConsentimiento,
        idPaciente,
        idCita,
        archivoUrl,
      });
      res.status(201).json({ message: 'Consentimiento firmado guardado exitosamente.', data: signed });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getPatientConsents = async (req: Request, res: Response): Promise<void> => {
    try {
      const idPaciente = Number(req.params.idPaciente);
      const consents = await this.consentRepo.getSignedConsentsByPatient(idPaciente);
      res.json({ data: consents });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}