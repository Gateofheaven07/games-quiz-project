import he from 'he';
import translate from 'google-translate-api-next';

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

export async function fetchAndTranslate(categoryId: number, amount: number = 10): Promise<TranslatedQuestion[]> {
  try {
    const response = await fetch(`https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=medium&type=multiple`);
    const data = await response.json() as any;

    if (data.response_code !== 0) {
      throw new Error('Failed to fetch trivia questions');
    }

    const translatedQuestions: TranslatedQuestion[] = [];

    // Collect all strings to translate
    const textsToTranslate: string[] = [];
    for (const item of data.results as TriviaQuestion[]) {
      textsToTranslate.push(he.decode(item.question));
      textsToTranslate.push(he.decode(item.correct_answer));
      item.incorrect_answers.forEach(ans => textsToTranslate.push(he.decode(ans)));
    }

    // Translate all at once in an array
    const translationResults = await translate(textsToTranslate, { to: 'id' });
    const translatedTexts = (translationResults as unknown as any[]).map(res => res.text);

    // Reconstruct questions
    let textIndex = 0;
    for (const item of data.results as TriviaQuestion[]) {
      const translatedQ = translatedTexts[textIndex++];
      const translatedCorrect = translatedTexts[textIndex++];
      
      const translatedIncorrect = [];
      for (let i = 0; i < item.incorrect_answers.length; i++) {
        translatedIncorrect.push(translatedTexts[textIndex++]);
      }

      // Combine and shuffle options
      const options = [translatedCorrect, ...translatedIncorrect];
      options.sort(() => Math.random() - 0.5);

      translatedQuestions.push({
        question: translatedQ,
        options,
        correctAnswer: translatedCorrect,
        categoryId,
      });
    }

    return translatedQuestions;
  } catch (error) {
    console.error('Error fetching and translating trivia:', error);
    throw error;
  }
}
