export interface TriviaQuestion {
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
}
export interface TranslatedQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    categoryId: number;
}
export declare function fetchAndTranslate(categoryId: number, amount?: number): Promise<TranslatedQuestion[]>;
//# sourceMappingURL=trivia.d.ts.map