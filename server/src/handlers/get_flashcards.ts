import { db } from '../db';
import { flashcardsTable } from '../db/schema';
import { type Flashcard } from '../schema';

export const getFlashcards = async (): Promise<Flashcard[]> => {
  try {
    const results = await db.select()
      .from(flashcardsTable)
      .execute();

    return results.map(flashcard => ({
      ...flashcard,
      options: flashcard.options ? (flashcard.options as string[]) : null
    }));
  } catch (error) {
    console.error('Flashcard retrieval failed:', error);
    throw error;
  }
};