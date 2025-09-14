import { db } from '../db';
import { flashcardsTable, answersTable } from '../db/schema';
import { type SubmitAnswerInput, type Answer } from '../schema';
import { eq } from 'drizzle-orm';

export async function submitAnswer(input: SubmitAnswerInput): Promise<Answer> {
  try {
    // 1. Fetch the flashcard to get the correct answer
    const flashcards = await db.select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.id, input.flashcard_id))
      .execute();

    if (flashcards.length === 0) {
      throw new Error(`Flashcard with id ${input.flashcard_id} not found`);
    }

    const flashcard = flashcards[0];

    // 2. Compare user answer with correct answer
    let isCorrect = false;
    const userAnswer = input.user_answer.trim();
    const correctAnswer = flashcard.correct_answer.trim();

    if (flashcard.flashcard_type === 'true_false') {
      // Handle boolean comparison for true/false questions
      const normalizedUserAnswer = userAnswer.toLowerCase();
      const normalizedCorrectAnswer = correctAnswer.toLowerCase();
      
      // Accept variations of true/false answers
      const trueVariations = ['true', 't', 'yes', 'y', '1'];
      const falseVariations = ['false', 'f', 'no', 'n', '0'];
      
      const userIsTrue = trueVariations.includes(normalizedUserAnswer);
      const userIsFalse = falseVariations.includes(normalizedUserAnswer);
      const correctIsTrue = trueVariations.includes(normalizedCorrectAnswer);
      
      isCorrect = (userIsTrue && correctIsTrue) || (userIsFalse && !correctIsTrue);
    } else {
      // Case-insensitive comparison for text-based questions
      isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    }

    // 3. Store the answer result in the database
    const result = await db.insert(answersTable)
      .values({
        flashcard_id: input.flashcard_id,
        user_answer: input.user_answer,
        is_correct: isCorrect
      })
      .returning()
      .execute();

    // 4. Return the answer record
    return result[0];
  } catch (error) {
    console.error('Submit answer failed:', error);
    throw error;
  }
}