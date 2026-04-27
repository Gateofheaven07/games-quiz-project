import { AuthPayload } from '../../../packages/shared/types';
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function generateTokens(payload: Omit<AuthPayload, 'iat' | 'exp'>): {
    token: never;
    refreshToken: never;
    expiresIn: number;
};
export declare function verifyToken(token: string): AuthPayload | null;
export declare function verifyRefreshToken(token: string): AuthPayload | null;
//# sourceMappingURL=auth.d.ts.map