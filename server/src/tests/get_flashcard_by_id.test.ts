import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dataTypesTable, propertiesTable, instancesTable, flashcardsTable } from '../db/schema';
import { getFlashcardById } from '../handlers/get_flashcard_by_id';

describe('getFlashcardById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent flashcard', async () => {
    const result = await getFlashcardById(999);
    expect(result).toBeNull();
  });

  it('should fetch a true_false flashcard by ID', async () => {
    // Create prerequisite data
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'World countries'
      })
      .returning()
      .execute();

    const property = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Capital',
        property_type: 'string'
      })
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'France'
      })
      .returning()
      .execute();

    // Create flashcard
    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance[0].id,
        property_id: property[0].id,
        flashcard_type: 'true_false',
        question: 'The capital of France is Paris. True or False?',
        correct_answer: 'true',
        options: null
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getFlashcardById(flashcard[0].id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(flashcard[0].id);
    expect(result!.instance_id).toEqual(instance[0].id);
    expect(result!.property_id).toEqual(property[0].id);
    expect(result!.flashcard_type).toEqual('true_false');
    expect(result!.question).toEqual('The capital of France is Paris. True or False?');
    expect(result!.correct_answer).toEqual('true');
    expect(result!.options).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should fetch a multiple_choice flashcard with options by ID', async () => {
    // Create prerequisite data
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'World countries'
      })
      .returning()
      .execute();

    const property = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Population',
        property_type: 'number'
      })
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Germany'
      })
      .returning()
      .execute();

    const options = ['80 million', '85 million', '90 million', '95 million'];

    // Create multiple choice flashcard
    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance[0].id,
        property_id: property[0].id,
        flashcard_type: 'multiple_choice',
        question: 'What is the population of Germany?',
        correct_answer: '85 million',
        options: options
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getFlashcardById(flashcard[0].id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(flashcard[0].id);
    expect(result!.flashcard_type).toEqual('multiple_choice');
    expect(result!.question).toEqual('What is the population of Germany?');
    expect(result!.correct_answer).toEqual('85 million');
    expect(result!.options).toEqual(options);
    expect(Array.isArray(result!.options)).toBe(true);
    expect(result!.options).toHaveLength(4);
  });

  it('should fetch a fill_in_blank flashcard by ID', async () => {
    // Create prerequisite data
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Element',
        description: 'Chemical elements'
      })
      .returning()
      .execute();

    const property = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Symbol',
        property_type: 'string'
      })
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Oxygen'
      })
      .returning()
      .execute();

    // Create fill in the blank flashcard
    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance[0].id,
        property_id: property[0].id,
        flashcard_type: 'fill_in_blank',
        question: 'The chemical symbol for Oxygen is ___.',
        correct_answer: 'O',
        options: null
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getFlashcardById(flashcard[0].id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(flashcard[0].id);
    expect(result!.flashcard_type).toEqual('fill_in_blank');
    expect(result!.question).toEqual('The chemical symbol for Oxygen is ___.');
    expect(result!.correct_answer).toEqual('O');
    expect(result!.options).toBeNull();
  });

  it('should handle database query properly', async () => {
    // Create a flashcard first
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Test Type',
        description: 'Test description'
      })
      .returning()
      .execute();

    const property = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Test Property',
        property_type: 'boolean'
      })
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Test Instance'
      })
      .returning()
      .execute();

    const flashcard = await db.insert(flashcardsTable)
      .values({
        instance_id: instance[0].id,
        property_id: property[0].id,
        flashcard_type: 'true_false',
        question: 'Test question?',
        correct_answer: 'false',
        options: null
      })
      .returning()
      .execute();

    // Verify the flashcard exists in the database
    const directQuery = await db.select()
      .from(flashcardsTable)
      .execute();
    
    expect(directQuery).toHaveLength(1);
    expect(directQuery[0].id).toEqual(flashcard[0].id);

    // Test our handler retrieves the same data
    const handlerResult = await getFlashcardById(flashcard[0].id);
    expect(handlerResult).toBeDefined();
    expect(handlerResult!.id).toEqual(directQuery[0].id);
    expect(handlerResult!.question).toEqual(directQuery[0].question);
  });
});