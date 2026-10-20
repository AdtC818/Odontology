import { Request, Response } from 'express';
import { AppointmentRepository } from './appointment.repository';
import { MailerService } from '../../../shared/infrastructure/mail/mailer.service';

export class AppointmentsController {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly mailerService: MailerService = new MailerService()
  ) {}

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
      const {
        nombreSolicitante,
        documentoSolicitante,
        correoSolicitante,
        telefonoSolicitante,
        fechaNacimiento,
        bloqueSolicitado,
        descripcion,
        idProfesional,
        servicio,
        autorizacionDatos,
      } = req.body;

      if (!nombreSolicitante || !documentoSolicitante || !correoSolicitante || !bloqueSolicitado) {
        res.status(400).json({
          message: 'Nombre, documento, correo y horario son campos obligatorios para la solicitud (RF-AGE-003).',
        });
        return;
      }

      if (autorizacionDatos === false || autorizacionDatos === undefined) {
        res.status(400).json({
          message: 'Debe aceptar la autorización de tratamiento de datos personales conforme a la ley colombiana (RQNF-SEG-005).',
        });
        return;
      }

      const result = await this.appointmentRepo.createPublicRequest({
        nombreSolicitante,
        documentoSolicitante,
        correoSolicitante,
        telefonoSolicitante,
        fechaNacimiento,
        bloqueSolicitado,
        descripcion,
        idProfesional,
        servicio: servicio || 'Odontología general',
        autorizacionDatos: Boolean(autorizacionDatos),
      });

      // Envío de correo de confirmación de solicitud recibida (RF-AGE-003, RQNF-FIA-004)
      try {
        const parts = String(bloqueSolicitado).split(' ');
        const fecha = parts[0] || bloqueSolicitado;
        const hora = (parts[1] || '').slice(0, 5) || 'Por confirmar';
        const doctorName = idProfesional === 2 || servicio === 'Ortodoncia' ? 'Dra. Natalia Díaz' : 'Dr. Eduar Leal Álvarez';
        await this.mailerService.sendPublicRequestReceivedEmail({
          to: correoSolicitante.trim(),
          nombreSolicitante: nombreSolicitante.trim(),
          fecha,
          hora,
          doctor: doctorName,
          motivo: descripcion || 'Valoración odontológica solicitada',
          idSolicitud: (result as any).solicitud?.id_solicitud,
        });
      } catch (mailError: any) {
        console.error('RQNF-FIA-004: Falla en envío de correo al registrar solicitud:', mailError?.message);
      }

      res.status(201).json({
        message: 'Solicitud registrada y sujeta a aprobación del consultorio. Para cambiar o cancelar comuníquese al consultorio.',
        data: result,
      });
    } catch (error: any) {
      const isConflict =
        error.message?.includes('no se encuentra disponible') ||
        error.message?.includes('ya está ocupado') ||
        error.message?.includes('ya tiene una cita Solicitada');
      res.status(isConflict ? 409 : 400).json({
        message: error.message,
        code: isConflict ? 'CONFLICT' : 'BAD_REQUEST',
      });
    }
  };

  reviewRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const idSolicitud = Number(req.params.id);
      const { idUsuarioGestor, aprobar, motivo, idPaciente, idProfesional } = req.body;
      const result: any = await this.appointmentRepo.reviewRequest({
        idSolicitud,
        idUsuarioGestor: idUsuarioGestor || 1,
        aprobar,
        motivo: motivo || (aprobar ? 'Solicitud aprobada' : 'Solicitud rechazada'),
        idPaciente,
        idProfesional,
      });

      // Notificación por correo al solicitante al aprobar o rechazar (RF-AGE-005, RQNF-FIA-004)
      if (result?.correoPaciente) {
        try {
          const parts = String(result.fechaHora || '').split(' ');
          const fecha = parts[0] || 'Por confirmar';
          const hora = (parts[1] || '').slice(0, 5) || 'Por confirmar';

          if (aprobar) {
            await this.mailerService.sendAppointmentConfirmationEmail({
              to: result.correoPaciente,
              nombrePaciente: result.nombrePaciente || 'Paciente',
              fecha,
              hora,
              doctor: 'Dr. Eduar Leal Álvarez',
              motivo: result.titulo || 'Cita Odontológica Confirmada',
              idCita: result.id_cita,
            });
          }
        } catch (mailError: any) {
          console.error('RQNF-FIA-004: Falla en envío de correo de revisión de solicitud:', mailError?.message);
        }
      }

      res.json({ message: 'Solicitud gestionada correctamente.', data: result });
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
      res.status(201).json({ message: 'Cita confirmada exitosamente.', data: cita });
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
      const idPaciente = req.query.idPaciente ? Number(req.query.idPaciente) : undefined;
      const agenda = await this.appointmentRepo.getAgenda(idProfesional, idPaciente);
      res.json({ data: agenda });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}