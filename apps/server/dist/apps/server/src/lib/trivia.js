import he from 'he';
import translate from 'google-translate-api-next';
export async function fetchAndTranslate(categoryId, amount = 10) {
    try {
        const response = await fetch(`https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=medium&type=multiple`);
        const data = await response.json();
        if (data.response_code !== 0) {
            throw new Error('Failed to fetch trivia questions');
        }
        const translatedQuestions = [];
        // Collect all strings to translate
        const textsToTranslate = [];
        for (const item of data.results) {
            textsToTranslate.push(he.decode(item.question));
            textsToTranslate.push(he.decode(item.correct_answer));
            item.incorrect_answers.forEach(ans => textsToTranslate.push(he.decode(ans)));
        }
        // Translate all at once in an array
        const translationResults = await translate(textsToTranslate, { to: 'id' });
        const translatedTexts = translationResults.map(res => res.text);
        // Reconstruct questions
        let textIndex = 0;
        for (const item of data.results) {
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
    }
    catch (error) {
        console.error('Error fetching and translating trivia:', error);
        throw error;
    }
}
//# sourceMappingURL=trivia.js.map