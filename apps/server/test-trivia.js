import { fetchAndTranslate } from './src/lib/trivia.js';

async function run() {
  try {
    console.time("fetchAndTranslate");
    const questions = await fetchAndTranslate(9, 10);
    console.timeEnd("fetchAndTranslate");
    console.log(questions[0]);
  } catch (err) {
    console.error(err);
  }
}

run();
