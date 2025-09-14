import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  dataTypesTable, 
  propertiesTable, 
  instancesTable, 
  flashcardsTable 
} from '../db/schema';
import { getFlashcardsByInstance } from '../handlers/get_flashcards_by_instance';
import { eq } from 'drizzle-orm';

describe('getFlashcardsByInstance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return flashcards for a specific instance', async () => {
    // Create test data type
    const [dataType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'World countries'
      })
      .returning()
      .execute();

    // Create test property
    const [property] = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'Capital',
        property_type: 'string'
      })
      .returning()
      .execute();

    // Create test instance
    const [instance] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'France'
      })
      .returning()
      .execute();

    // Create test flashcards
    const flashcard1 = await db.insert(flashcardsTable)
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

    const flashcard2 = await db.insert(flashcardsTable)
      .values({
        instance_id: instance.id,
        property_id: property.id,
        flashcard_type: 'multiple_choice',
        question: 'Which city is the capital of France?',
        correct_answer: 'Paris',
        options: ['London', 'Paris', 'Berlin', 'Madrid']
      })
      .returning()
      .execute();

    const result = await getFlashcardsByInstance(instance.id);

    expect(result).toHaveLength(2);
    
    // Check first flashcard
    const fillInBlank = result.find(f => f.flashcard_type === 'fill_in_blank');
    expect(fillInBlank).toBeDefined();
    expect(fillInBlank!.instance_id).toEqual(instance.id);
    expect(fillInBlank!.property_id).toEqual(property.id);
    expect(fillInBlank!.question).toEqual('What is the capital of France?');
    expect(fillInBlank!.correct_answer).toEqual('Paris');
    expect(fillInBlank!.options).toBeNull();
    expect(fillInBlank!.id).toBeDefined();
    expect(fillInBlank!.created_at).toBeInstanceOf(Date);

    // Check second flashcard
    const multipleChoice = result.find(f => f.flashcard_type === 'multiple_choice');
    expect(multipleChoice).toBeDefined();
    expect(multipleChoice!.instance_id).toEqual(instance.id);
    expect(multipleChoice!.property_id).toEqual(property.id);
    expect(multipleChoice!.question).toEqual('Which city is the capital of France?');
    expect(multipleChoice!.correct_answer).toEqual('Paris');
    expect(multipleChoice!.options).toEqual(['London', 'Paris', 'Berlin', 'Madrid']);
    expect(multipleChoice!.id).toBeDefined();
    expect(multipleChoice!.created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for instance with no flashcards', async () => {
    // Create test data type
    const [dataType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'World countries'
      })
      .returning()
      .execute();

    // Create test instance without flashcards
    const [instance] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'Germany'
      })
      .returning()
      .execute();

    const result = await getFlashcardsByInstance(instance.id);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent instance', async () => {
    const result = await getFlashcardsByInstance(99999);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return flashcards for the specified instance', async () => {
    // Create test data type
    const [dataType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'World countries'
      })
      .returning()
      .execute();

    // Create test property
    const [property] = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'Capital',
        property_type: 'string'
      })
      .returning()
      .execute();

    // Create two test instances
    const [instance1] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'France'
      })
      .returning()
      .execute();

    const [instance2] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'Spain'
      })
      .returning()
      .execute();

    // Create flashcards for both instances
    await db.insert(flashcardsTable)
      .values({
        instance_id: instance1.id,
        property_id: property.id,
        flashcard_type: 'true_false',
        question: 'Paris is the capital of France',
        correct_answer: 'true',
        options: null
      })
      .execute();

    await db.insert(flashcardsTable)
      .values({
        instance_id: instance2.id,
        property_id: property.id,
        flashcard_type: 'true_false',
        question: 'Madrid is the capital of Spain',
        correct_answer: 'true',
        options: null
      })
      .execute();

    // Query for instance1 flashcards only
    const result = await getFlashcardsByInstance(instance1.id);

    expect(result).toHaveLength(1);
    expect(result[0].instance_id).toEqual(instance1.id);
    expect(result[0].question).toEqual('Paris is the capital of France');

    // Verify instance2 flashcard was not included
    const instance2Flashcard = result.find(f => f.instance_id === instance2.id);
    expect(instance2Flashcard).toBeUndefined();
  });

  it('should handle different flashcard types correctly', async () => {
    // Create test data
    const [dataType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'World countries'
      })
      .returning()
      .execute();

    const [property] = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'Population',
        property_type: 'number'
      })
      .returning()
      .execute();

    const [instance] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'Japan'
      })
      .returning()
      .execute();

    // Create flashcards of different types
    await db.insert(flashcardsTable)
      .values([
        {
          instance_id: instance.id,
          property_id: property.id,
          flashcard_type: 'true_false',
          question: 'Japan has over 100 million people',
          correct_answer: 'true',
          options: null
        },
        {
          instance_id: instance.id,
          property_id: property.id,
          flashcard_type: 'multiple_choice',
          question: 'What is the approximate population of Japan?',
          correct_answer: '125 million',
          options: ['50 million', '75 million', '125 million', '200 million']
        },
        {
          instance_id: instance.id,
          property_id: property.id,
          flashcard_type: 'fill_in_blank',
          question: 'Japan has approximately ___ million people',
          correct_answer: '125',
          options: null
        }
      ])
      .execute();

    const result = await getFlashcardsByInstance(instance.id);

    expect(result).toHaveLength(3);

    const trueFalse = result.find(f => f.flashcard_type === 'true_false');
    const multipleChoice = result.find(f => f.flashcard_type === 'multiple_choice');
    const fillInBlank = result.find(f => f.flashcard_type === 'fill_in_blank');

    expect(trueFalse).toBeDefined();
    expect(trueFalse!.options).toBeNull();

    expect(multipleChoice).toBeDefined();
    expect(multipleChoice!.options).toEqual(['50 million', '75 million', '125 million', '200 million']);

    expect(fillInBlank).toBeDefined();
    expect(fillInBlank!.options).toBeNull();
  });
});