import { Request, Response } from 'express';
import { ClinicalRecordRepository } from './clinical-record.repository';

export class ClinicalRecordsController {
  constructor(private readonly clinicalRepo: ClinicalRecordRepository) {}

  createEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idPaciente, idCita, payload } = req.body;
      if (!idPaciente || !idCita || !payload || !payload.diligenciadoPor) {
        res.status(400).json({
          message: 'idPaciente, idCita y payload con metadatos "diligenciadoPor" son obligatorios (Regla 10).',
        });
        return;
      }
      const entry = await this.clinicalRepo.createEvolutionEntry({ idPaciente, idCita, payload });
      res.status(201).json({ message: 'Registro clínico guardado exitosamente.', data: entry });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updateEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const idEvolucion = Number(req.params.idEvolucion);
      const { payload } = req.body;
      const updated = await this.clinicalRepo.updateEvolutionEntrySameDay(idEvolucion, payload);
      res.json({ message: 'Historia clínica actualizada dentro del plazo legal.', data: updated });
    } catch (error: any) {
      res.status(403).json({ message: error.message });
    }
  };

  getHistoryByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const idPaciente = Number(req.params.idPaciente);
      const history = await this.clinicalRepo.getClinicalHistoryByPatient(idPaciente);
      res.json({ data: history });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}