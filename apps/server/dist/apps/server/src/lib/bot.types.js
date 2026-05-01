/**
 * bot.types.ts
 *
 * TypeScript Discriminated Unions untuk membedakan tipe lawan.
 * Abstraction Layer: client interface sama untuk Bot maupun Human.
 */
export const BOT_DIFFICULTY_CONFIGS = {
    EASY: {
        accuracy: 0.40,
        responseDelayMs: [5000, 8000],
        label: 'Mudah',
        emoji: '🟢',
        description: 'Akurasi 40%, respons 5–8 detik',
    },
    MEDIUM: {
        accuracy: 0.65,
        responseDelayMs: [3000, 5000],
        label: 'Sedang',
        emoji: '🟡',
        description: 'Akurasi 65%, respons 3–5 detik',
    },
    HARD: {
        accuracy: 0.90,
        responseDelayMs: [1000, 3000],
        label: 'Sulit',
        emoji: '🔴',
        description: 'Akurasi 90%, respons 1–3 detik',
    },
};
//# sourceMappingURL=bot.types.js.map