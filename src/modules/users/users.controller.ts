import { Request, Response, NextFunction } from "express";
import { UsersService } from "./users.service";
import { AddressesService } from "./addresses.service";

function getUserId(req: Request) {
  return (req as any).user?.sub as string;
}

export class UsersController {
  private users = new UsersService();
  private addresses = new AddressesService();

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const user = await this.users.getMe(userId);
      res.json(user);
    } catch (e) {
      next(e);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const updated = await this.users.updateMe(userId, req.body);
      res.json(updated);
    } catch (e) {
      next(e);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const { currentPassword, newPassword } = req.body;
      const out = await this.users.changePassword(userId, currentPassword, newPassword);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  // Addresses
  listAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const out = await this.addresses.list(userId);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  createAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const out = await this.addresses.create(userId, req.body);
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  };

  updateAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const out = await this.addresses.update(userId, String(req.params.id), req.body);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const out = await this.addresses.remove(userId, String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  setDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const out = await this.addresses.setDefault(userId, String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}
