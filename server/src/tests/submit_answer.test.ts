import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dataTypesTable, propertiesTable, instancesTable, flashcardsTable, answersTable } from '../db/schema';
import { type SubmitAnswerInput } from '../schema';
import { submitAnswer } from '../handlers/submit_answer';
import { eq } from 'drizzle-orm';

describe('submitAnswer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create data type
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Test Type',
        description: 'A test data type'
      })
      .returning()
      .execute();

    // Create property
    const property = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Test Property',
        property_type: 'string'
      })
      .returning()
      .execute();

    // Create instance
    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Test Instance'
      })
      .returning()
      .execute();

    return {
      dataType: dataType[0],
      property: property[0],
      instance: instance[0]
    };
  };

  it('should submit correct answer for text question', async () => {
    const { instance, property } = await createTestData();

    // Create a fill-in-blank flashcard
    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'fill_in_blank',
        question: 'What is the capital of France?',
        correct_answer: 'Paris',
        options: null
      })
      .returning()
      .execute();

    const input: SubmitAnswerInput = {
      flashcard_id: flashcard[0].id,
      user_answer: 'Paris'
    };

    const result = await submitAnswer(input);

    expect(result.flashcard_id).toEqual(flashcard[0].id);
    expect(result.user_answer).toEqual('Paris');
    expect(result.is_correct).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.answered_at).toBeInstanceOf(Date);
  });

  it('should submit incorrect answer for text question', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'fill_in_blank',
        question: 'What is the capital of France?',
        correct_answer: 'Paris',
        options: null
      })
      .returning()
      .execute();

    const input: SubmitAnswerInput = {
      flashcard_id: flashcard[0].id,
      user_answer: 'London'
    };

    const result = await submitAnswer(input);

    expect(result.flashcard_id).toEqual(flashcard[0].id);
    expect(result.user_answer).toEqual('London');
    expect(result.is_correct).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.answered_at).toBeInstanceOf(Date);
  });

  it('should handle case-insensitive text comparison', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'multiple_choice',
        question: 'What is the capital of France?',
        correct_answer: 'Paris',
        options: ['Paris', 'London', 'Berlin', 'Madrid']
      })
      .returning()
      .execute();

    const input: SubmitAnswerInput = {
      flashcard_id: flashcard[0].id,
      user_answer: 'PARIS'
    };

    const result = await submitAnswer(input);

    expect(result.is_correct).toBe(true);
    expect(result.user_answer).toEqual('PARIS'); // Original case preserved
  });

  it('should handle true/false questions with "true" answer', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'true_false',
        question: 'Paris is the capital of France.',
        correct_answer: 'true',
        options: null
      })
      .returning()
      .execute();

    const input: SubmitAnswerInput = {
      flashcard_id: flashcard[0].id,
      user_answer: 'true'
    };

    const result = await submitAnswer(input);

    expect(result.is_correct).toBe(true);
  });

  it('should handle true/false questions with "false" answer', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'true_false',
        question: 'London is the capital of France.',
        correct_answer: 'false',
        options: null
      })
      .returning()
      .execute();

    const input: SubmitAnswerInput = {
      flashcard_id: flashcard[0].id,
      user_answer: 'false'
    };

    const result = await submitAnswer(input);

    expect(result.is_correct).toBe(true);
  });

  it('should handle true/false question variations', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'true_false',
        question: 'Paris is the capital of France.',
        correct_answer: 'true',
        options: null
      })
      .returning()
      .execute();

    // Test various true variations
    const trueVariations = ['True', 'TRUE', 't', 'T', 'yes', 'YES', 'y', 'Y', '1'];
    
    for (const variation of trueVariations) {
      const input: SubmitAnswerInput = {
        flashcard_id: flashcard[0].id,
        user_answer: variation
      };

      const result = await submitAnswer(input);
      expect(result.is_correct).toBe(true);
    }
  });

  it('should handle false variations for true/false questions', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'true_false',
        question: 'London is the capital of France.',
        correct_answer: 'false',
        options: null
      })
      .returning()
      .execute();

    // Test various false variations
    const falseVariations = ['False', 'FALSE', 'f', 'F', 'no', 'NO', 'n', 'N', '0'];
    
    for (const variation of falseVariations) {
      const input: SubmitAnswerInput = {
        flashcard_id: flashcard[0].id,
        user_answer: variation
      };

      const result = await submitAnswer(input);
      expect(result.is_correct).toBe(true);
    }
  });

  it('should save answer to database', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'fill_in_blank',
        question: 'Test question',
        correct_answer: 'Test answer',
        options: null
      })
      .returning()
      .execute();

    const input: SubmitAnswerInput = {
      flashcard_id: flashcard[0].id,
      user_answer: 'Test answer'
    };

    const result = await submitAnswer(input);

    // Verify the answer was saved to database
    const savedAnswers = await db.select()
      .from(answersTable)
      .where(eq(answersTable.id, result.id))
      .execute();

    expect(savedAnswers).toHaveLength(1);
    expect(savedAnswers[0].flashcard_id).toEqual(flashcard[0].id);
    expect(savedAnswers[0].user_answer).toEqual('Test answer');
    expect(savedAnswers[0].is_correct).toBe(true);
    expect(savedAnswers[0].answered_at).toBeInstanceOf(Date);
  });

  it('should handle whitespace in answers', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'fill_in_blank',
        question: 'What is the capital of France?',
        correct_answer: ' Paris ',
        options: null
      })
      .returning()
      .execute();

    const input: SubmitAnswerInput = {
      flashcard_id: flashcard[0].id,
      user_answer: '  PARIS  '
    };

    const result = await submitAnswer(input);

    expect(result.is_correct).toBe(true);
    expect(result.user_answer).toEqual('  PARIS  '); // Original preserved
  });

  it('should throw error for non-existent flashcard', async () => {
    const input: SubmitAnswerInput = {
      flashcard_id: 99999,
      user_answer: 'Any answer'
    };

    await expect(submitAnswer(input)).rejects.toThrow(/flashcard with id 99999 not found/i);
  });

  it('should handle incorrect true/false answer', async () => {
    const { instance, property } = await createTestData();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'true_false',
        question: 'Paris is the capital of France.',
        correct_answer: 'true',
        options: null
      })
      .returning()
      .execute();

    const input: SubmitAnswerInput = {
      flashcard_id: flashcard[0].id,
      user_answer: 'false'
    };

    const result = await submitAnswer(input);

    expect(result.is_correct).toBe(false);
    expect(result.user_answer).toEqual('false');
  });
});