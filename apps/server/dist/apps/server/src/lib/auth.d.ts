import { AuthPayload } from '@quiz-battle/shared';
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function generateTokens(payload: Omit<AuthPayload, 'iat' | 'exp'>): {
    token: string;
    refreshToken: string;
    expiresIn: number;
};
export declare function verifyToken(token: string): AuthPayload | null;
export declare function verifyRefreshToken(token: string): AuthPayload | null;
//# sourceMappingURL=auth.d.ts.map