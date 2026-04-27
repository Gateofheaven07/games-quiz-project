import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        username: string;
        email: string;
    };
}
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map