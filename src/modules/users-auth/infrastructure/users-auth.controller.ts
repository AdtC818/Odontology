import { Request, Response } from 'express';
import { UserRepository } from './user.repository';

export class UsersAuthController {
  constructor(private readonly userRepo: UserRepository) {}

  createRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombreRol } = req.body;
      if (!nombreRol) {
        res.status(400).json({ message: 'El campo nombreRol es obligatorio.' });
        return;
      }
      const role = await this.userRepo.createRole(nombreRol);
      res.status(201).json({ message: 'Rol creado exitosamente.', data: role });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getRoles = async (_req: Request, res: Response): Promise<void> => {
    try {
      const roles = await this.userRepo.findAllRoles();
      res.json({ data: roles });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  deleteRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const idRol = Number(req.params.id);
      await this.userRepo.deleteRole(idRol);
      res.json({ message: 'Rol eliminado exitosamente.' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombreCompleto, documentoIdentidad, correo, telefono, contrasenaHash, rolesIds } = req.body;
      if (!nombreCompleto || !documentoIdentidad || !correo || !contrasenaHash || !Array.isArray(rolesIds) || rolesIds.length === 0) {
        res.status(400).json({ message: 'Faltan campos obligatorios o asignar al menos un rol (RF-USR-001).' });
        return;
      }
      const user = await this.userRepo.createUser({
        nombreCompleto,
        documentoIdentidad,
        correo,
        telefono,
        contrasenaHash,
        rolesIds,
      });
      res.status(201).json({ message: 'Usuario creado en estado Activo.', data: user });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documento, nombre, estado } = req.query;
      const users = await this.userRepo.searchUsers({
        documento: documento ? String(documento) : undefined,
        nombre: nombre ? String(nombre) : undefined,
        estado: estado !== undefined ? estado === 'true' : undefined,
      });
      if (users.length === 0) {
        res.status(404).json({ message: 'ninguna coincidencia encontrada', data: [] });
        return;
      }
      res.json({ data: users });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const idUsuario = Number(req.params.id);
      const { estado } = req.body;
      const updated = await this.userRepo.updateStatus(idUsuario, Boolean(estado));
      res.json({
        message: `Usuario ${estado ? 'activado' : 'inactivado'} exitosamente.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}