import { db } from '../db';
import { flashcardsTable } from '../db/schema';
import { type Flashcard } from '../schema';
import { eq } from 'drizzle-orm';

export async function getFlashcardById(id: number): Promise<Flashcard | null> {
  try {
    const results = await db.select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const flashcard = results[0];
    return {
      ...flashcard,
      options: flashcard.options as string[] | null // Cast jsonb to proper type
    };
  } catch (error) {
    console.error('Failed to fetch flashcard by ID:', error);
    throw error;
  }
}