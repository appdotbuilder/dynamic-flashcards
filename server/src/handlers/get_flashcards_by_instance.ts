import { db } from '../db';
import { flashcardsTable } from '../db/schema';
import { type Flashcard } from '../schema';
import { eq } from 'drizzle-orm';

export const getFlashcardsByInstance = async (instanceId: number): Promise<Flashcard[]> => {
  try {
    const results = await db.select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.instance_id, instanceId))
      .execute();

    return results.map(flashcard => ({
      ...flashcard,
      options: flashcard.options as string[] | null // Ensure proper typing for JSON field
    }));
  } catch (error) {
    console.error('Failed to get flashcards by instance:', error);
    throw error;
  }
};