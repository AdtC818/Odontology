import { Request, Response } from 'express';
import { AppointmentRepository } from './appointment.repository';

export class AppointmentsController {
  constructor(private readonly appointmentRepo: AppointmentRepository) {}

  upsertTimeSlot = async (req: Request, res: Response): Promise<void> => {
    try {
      const { inicio, final, estado } = req.body;
      const slot = await this.appointmentRepo.upsertTimeSlot(inicio, final, estado ?? true);
      res.status(201).json({ message: 'Bloque de horario actualizado.', data: slot });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getTimeSlots = async (req: Request, res: Response): Promise<void> => {
    try {
      const { desde, hasta } = req.query;
      const slots = await this.appointmentRepo.getTimeSlots(
        desde ? String(desde) : undefined,
        hasta ? String(hasta) : undefined
      );
      res.json({ data: slots });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  requestAppointmentPublic = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombreSolicitante, documentoSolicitante, correoSolicitante, bloqueSolicitado, descripcion } = req.body;
      const result = await this.appointmentRepo.createPublicRequest({
        nombreSolicitante,
        documentoSolicitante,
        correoSolicitante,
        bloqueSolicitado,
        descripcion,
      });
      res.status(201).json({
        message: 'Solicitud registrada y sujeta a aprobación del consultorio (RF-AGE-003).',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  reviewRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const idSolicitud = Number(req.params.id);
      const { idUsuarioGestor, aprobar, motivo, idPaciente, idProfesional } = req.body;
      const result = await this.appointmentRepo.reviewRequest({
        idSolicitud,
        idUsuarioGestor,
        aprobar,
        motivo,
        idPaciente,
        idProfesional,
      });
      res.json({ message: 'Solicitud gestionada correctamente (RF-AGE-005).', data: result });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  scheduleAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { titulo, descripcion, idPaciente, idUsuarioProfesional, idUsuarioGestor, bloques } = req.body;
      const cita = await this.appointmentRepo.scheduleAppointment({
        titulo,
        descripcion,
        idPaciente,
        idUsuarioProfesional,
        idUsuarioGestor,
        bloques,
      });
      res.status(201).json({ message: 'Cita Confirmada exitosamente (RF-AGE-002).', data: cita });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  changeState = async (req: Request, res: Response): Promise<void> => {
    try {
      const idCita = Number(req.params.id);
      const { nuevoEstado, idUsuarioGestor, motivo, liberarBloques } = req.body;
      const updated = await this.appointmentRepo.changeAppointmentState({
        idCita,
        nuevoEstado,
        idUsuarioGestor,
        motivo,
        liberarBloques,
      });
      res.json({ message: `Cita actualizada a estado ${nuevoEstado}.`, data: updated });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getAgenda = async (req: Request, res: Response): Promise<void> => {
    try {
      const idProfesional = req.query.idProfesional ? Number(req.query.idProfesional) : undefined;
      const agenda = await this.appointmentRepo.getAgenda(idProfesional);
      res.json({ data: agenda });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}