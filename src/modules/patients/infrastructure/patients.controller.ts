import { Request, Response } from 'express';
import { PatientRepository } from './patient.repository';

export class PatientsController {
  constructor(private readonly patientRepo: PatientRepository) {}

  createPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombreCompleto, documentoIdentidad, correo, telefono, fechaNacimiento, sexo } = req.body;
      if (!nombreCompleto || !documentoIdentidad || !fechaNacimiento) {
        res.status(400).json({ message: 'Nombre, documento y fecha de nacimiento son obligatorios (RF-HCL-001).' });
        return;
      }
      const patient = await this.patientRepo.createPatient({
        nombreCompleto,
        documentoIdentidad,
        correo,
        telefono,
        fechaNacimiento,
        sexo,
      });
      res.status(201).json({ message: 'Paciente creado con historial clínico vacío.', data: patient });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updatePatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const idPaciente = Number(req.params.id);
      const updated = await this.patientRepo.updatePatient(idPaciente, req.body);
      if (!updated) {
        res.status(404).json({ message: 'Paciente no encontrado.' });
        return;
      }
      res.json({ message: 'Datos del paciente actualizados (RF-HCL-002).', data: updated });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  searchPatients = async (req: Request, res: Response): Promise<void> => {
    try {
      const q = req.query.q ? String(req.query.q) : undefined;
      const results = await this.patientRepo.searchPatients(q);
      if (results.length === 0) {
        res.status(404).json({ message: 'ninguna coincidencia encontrada', data: [] });
        return;
      }
      res.json({ data: results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getPatientProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const idPaciente = Number(req.params.id);
      const profile = await this.patientRepo.getPatientProfileByIdOrDoc({ idPaciente });
      if (!profile) {
        res.status(404).json({ message: 'Paciente no encontrado.' });
        return;
      }
      res.json({ data: profile });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}