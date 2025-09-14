import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dataTypesTable, propertiesTable, instancesTable, flashcardsTable } from '../db/schema';
import { getFlashcards } from '../handlers/get_flashcards';

describe('getFlashcards', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no flashcards exist', async () => {
    const result = await getFlashcards();
    expect(result).toEqual([]);
  });

  it('should return all flashcards', async () => {
    // Create prerequisite data
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Countries of the world'
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

    // Create test flashcards
    const flashcard1 = {
      instance_id: instance[0].id,
      property_id: property[0].id,
      flashcard_type: 'fill_in_blank' as const,
      question: 'What is the capital of France?',
      correct_answer: 'Paris',
      options: null
    };

    const flashcard2 = {
      instance_id: instance[0].id,
      property_id: property[0].id,
      flashcard_type: 'multiple_choice' as const,
      question: 'Which is the capital of France?',
      correct_answer: 'Paris',
      options: ['London', 'Paris', 'Berlin', 'Madrid']
    };

    const flashcard3 = {
      instance_id: instance[0].id,
      property_id: property[0].id,
      flashcard_type: 'true_false' as const,
      question: 'Paris is the capital of France',
      correct_answer: 'true',
      options: null
    };

    await db.insert(flashcardsTable)
      .values([flashcard1, flashcard2, flashcard3])
      .execute();

    const result = await getFlashcards();

    expect(result).toHaveLength(3);
    
    // Verify basic structure
    result.forEach(flashcard => {
      expect(flashcard.id).toBeDefined();
      expect(flashcard.instance_id).toEqual(instance[0].id);
      expect(flashcard.property_id).toEqual(property[0].id);
      expect(flashcard.question).toBeDefined();
      expect(flashcard.correct_answer).toBeDefined();
      expect(flashcard.created_at).toBeInstanceOf(Date);
      expect(['true_false', 'multiple_choice', 'fill_in_blank']).toContain(flashcard.flashcard_type);
    });

    // Verify specific flashcard content
    const fillInBlank = result.find(f => f.flashcard_type === 'fill_in_blank');
    expect(fillInBlank?.question).toEqual('What is the capital of France?');
    expect(fillInBlank?.correct_answer).toEqual('Paris');
    expect(fillInBlank?.options).toBeNull();

    const multipleChoice = result.find(f => f.flashcard_type === 'multiple_choice');
    expect(multipleChoice?.question).toEqual('Which is the capital of France?');
    expect(multipleChoice?.correct_answer).toEqual('Paris');
    expect(multipleChoice?.options).toEqual(['London', 'Paris', 'Berlin', 'Madrid']);

    const trueFalse = result.find(f => f.flashcard_type === 'true_false');
    expect(trueFalse?.question).toEqual('Paris is the capital of France');
    expect(trueFalse?.correct_answer).toEqual('true');
    expect(trueFalse?.options).toBeNull();
  });

  it('should handle flashcards with various property types', async () => {
    // Create data type for testing different property types
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Measurement',
        description: 'Various measurements'
      })
      .returning()
      .execute();

    // Create properties with different types
    const stringProperty = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Unit',
        property_type: 'string'
      })
      .returning()
      .execute();

    const numberProperty = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Value',
        property_type: 'number'
      })
      .returning()
      .execute();

    const booleanProperty = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'IsMetric',
        property_type: 'boolean'
      })
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'Length Meter'
      })
      .returning()
      .execute();

    // Create flashcards for each property type
    await db.insert(flashcardsTable)
      .values([
        {
          instance_id: instance[0].id,
          property_id: stringProperty[0].id,
          flashcard_type: 'fill_in_blank',
          question: 'What is the unit?',
          correct_answer: 'meter',
          options: null
        },
        {
          instance_id: instance[0].id,
          property_id: numberProperty[0].id,
          flashcard_type: 'multiple_choice',
          question: 'What is the standard value?',
          correct_answer: '1',
          options: ['0.5', '1', '2', '10']
        },
        {
          instance_id: instance[0].id,
          property_id: booleanProperty[0].id,
          flashcard_type: 'true_false',
          question: 'Is this a metric unit?',
          correct_answer: 'true',
          options: null
        }
      ])
      .execute();

    const result = await getFlashcards();

    expect(result).toHaveLength(3);
    
    // Verify we can retrieve flashcards for all property types
    const stringFlashcard = result.find(f => f.property_id === stringProperty[0].id);
    const numberFlashcard = result.find(f => f.property_id === numberProperty[0].id);
    const booleanFlashcard = result.find(f => f.property_id === booleanProperty[0].id);

    expect(stringFlashcard).toBeDefined();
    expect(numberFlashcard).toBeDefined();
    expect(booleanFlashcard).toBeDefined();
  });

  it('should handle flashcards from multiple instances and types', async () => {
    // Create two different data types
    const countryType = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Countries'
      })
      .returning()
      .execute();

    const animalType = await db.insert(dataTypesTable)
      .values({
        name: 'Animal',
        description: 'Animals'
      })
      .returning()
      .execute();

    // Create properties for each type
    const capitalProperty = await db.insert(propertiesTable)
      .values({
        type_id: countryType[0].id,
        name: 'Capital',
        property_type: 'string'
      })
      .returning()
      .execute();

    const habitatProperty = await db.insert(propertiesTable)
      .values({
        type_id: animalType[0].id,
        name: 'Habitat',
        property_type: 'string'
      })
      .returning()
      .execute();

    // Create instances
    const france = await db.insert(instancesTable)
      .values({
        type_id: countryType[0].id,
        name: 'France'
      })
      .returning()
      .execute();

    const lion = await db.insert(instancesTable)
      .values({
        type_id: animalType[0].id,
        name: 'Lion'
      })
      .returning()
      .execute();

    // Create flashcards for both instances
    await db.insert(flashcardsTable)
      .values([
        {
          instance_id: france[0].id,
          property_id: capitalProperty[0].id,
          flashcard_type: 'fill_in_blank',
          question: 'What is the capital of France?',
          correct_answer: 'Paris',
          options: null
        },
        {
          instance_id: lion[0].id,
          property_id: habitatProperty[0].id,
          flashcard_type: 'multiple_choice',
          question: 'Where do lions live?',
          correct_answer: 'Savanna',
          options: ['Forest', 'Savanna', 'Desert', 'Ocean']
        }
      ])
      .execute();

    const result = await getFlashcards();

    expect(result).toHaveLength(2);
    
    const countryFlashcard = result.find(f => f.instance_id === france[0].id);
    const animalFlashcard = result.find(f => f.instance_id === lion[0].id);

    expect(countryFlashcard).toBeDefined();
    expect(countryFlashcard?.question).toEqual('What is the capital of France?');
    
    expect(animalFlashcard).toBeDefined();
    expect(animalFlashcard?.question).toEqual('Where do lions live?');
    expect(animalFlashcard?.options).toEqual(['Forest', 'Savanna', 'Desert', 'Ocean']);
  });
});