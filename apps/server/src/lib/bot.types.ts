/**
 * bot.types.ts
 *
 * TypeScript Discriminated Unions untuk membedakan tipe lawan.
 * Abstraction Layer: client interface sama untuk Bot maupun Human.
 */

// ─── Difficulty ───────────────────────────────────────────────────────────────

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

export const BOT_DIFFICULTY_CONFIGS: Record<BotDifficulty, BotDifficultyConfig> = {
  EASY: {
    accuracy:        0.40,
    responseDelayMs: [5000, 8000],
    label:           'Mudah',
    emoji:           '🟢',
    description:     'Akurasi 40%, respons 5–8 detik',
  },
  MEDIUM: {
    accuracy:        0.65,
    responseDelayMs: [3000, 5000],
    label:           'Sedang',
    emoji:           '🟡',
    description:     'Akurasi 65%, respons 3–5 detik',
  },
  HARD: {
    accuracy:        0.90,
    responseDelayMs: [1000, 3000],
    label:           'Sulit',
    emoji:           '🔴',
    description:     'Akurasi 90%, respons 1–3 detik',
  },
};

// ─── Discriminated Union: Opponent ────────────────────────────────────────────

export interface HumanOpponent {
  type: 'HUMAN';
  userId: string;
  username: string;
  socketId: string;
}

export interface BotOpponent {
  type:       'BOT';
  userId:     string;   // deterministik: "bot-{difficulty}-{roomId}"
  username:   string;   // contoh: "QuizBot [Sulit]"
  difficulty: BotDifficulty;
}

/** Discriminated Union — gunakan `.type` untuk membedakan */
export type Opponent = HumanOpponent | BotOpponent;

// ─── Room metadata extension ──────────────────────────────────────────────────

export interface BotRoomMeta {
  isVsBot:        true;
  botDifficulty:  BotDifficulty;
  botUserId:      string;
}

export interface HumanRoomMeta {
  isVsBot: false;
}

export type RoomMeta = BotRoomMeta | HumanRoomMeta;
