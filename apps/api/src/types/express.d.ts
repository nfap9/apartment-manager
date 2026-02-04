import 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
      org?: {
        organizationId: string;
        membershipId: string;
        permissionKeys: string[];
      };
    }
  }
}

export {};

