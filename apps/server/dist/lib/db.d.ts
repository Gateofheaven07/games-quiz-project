import { PoolClient } from 'pg';
declare const pool: any;
export declare function query(text: string, params?: any[]): Promise<any>;
export declare function getClient(): Promise<PoolClient>;
export declare function initialize(): Promise<void>;
export default pool;
//# sourceMappingURL=db.d.ts.map