/**
 * bot.types.ts
 *
 * TypeScript Discriminated Unions untuk membedakan tipe lawan.
 * Abstraction Layer: client interface sama untuk Bot maupun Human.
 */
export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export interface BotDifficultyConfig {
    /** Probabilitas menjawab benar (0–1) */
    accuracy: number;
    /** Range delay respons dalam milidetik [min, max] */
    responseDelayMs: [number, number];
    /** Label UI */
    label: string;
    /** Emoji representasi */
    emoji: string;
    /** Deskripsi singkat */
    description: string;
}
export declare const BOT_DIFFICULTY_CONFIGS: Record<BotDifficulty, BotDifficultyConfig>;
export interface HumanOpponent {
    type: 'HUMAN';
    userId: string;
    username: string;
    socketId: string;
}
export interface BotOpponent {
    type: 'BOT';
    userId: string;
    username: string;
    difficulty: BotDifficulty;
}
/** Discriminated Union — gunakan `.type` untuk membedakan */
export type Opponent = HumanOpponent | BotOpponent;
export interface BotRoomMeta {
    isVsBot: true;
    botDifficulty: BotDifficulty;
    botUserId: string;
}
export interface HumanRoomMeta {
    isVsBot: false;
}
export type RoomMeta = BotRoomMeta | HumanRoomMeta;
//# sourceMappingURL=bot.types.d.ts.map