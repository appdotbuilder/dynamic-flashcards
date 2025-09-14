import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  dataTypesTable, 
  propertiesTable, 
  instancesTable, 
  propertyValuesTable, 
  flashcardsTable 
} from '../db/schema';
import { type GenerateFlashcardsInput } from '../schema';
import { generateFlashcards } from '../handlers/generate_flashcards';
import { eq } from 'drizzle-orm';

describe('generateFlashcards', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate flashcards for an instance with properties', async () => {
    // Setup: Create a data type
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'A country entity'
      })
      .returning()
      .execute();

    // Create properties
    const properties = await db.insert(propertiesTable)
      .values([
        {
          type_id: dataType[0].id,
          name: 'capital',
          property_type: 'string'
        },
        {
          type_id: dataType[0].id,
          name: 'population',
          property_type: 'number'
        }
      ])
      .returning()
      .execute();

    // Create an instance
    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'France'
      })
      .returning()
      .execute();

    // Create property values
    await db.insert(propertyValuesTable)
      .values([
        {
          instance_id: instance[0].id,
          property_id: properties[0].id,
          value: 'Paris'
        },
        {
          instance_id: instance[0].id,
          property_id: properties[1].id,
          value: '67000000'
        }
      ])
      .execute();

    const input: GenerateFlashcardsInput = {
      instance_id: instance[0].id
    };

    // Execute
    const result = await generateFlashcards(input);

    // Verify
    expect(result).toHaveLength(6); // 2 properties × 3 flashcard types each

    // Check that all flashcard types are generated
    const flashcardTypes = result.map(f => f.flashcard_type);
    expect(flashcardTypes.filter(t => t === 'true_false')).toHaveLength(2);
    expect(flashcardTypes.filter(t => t === 'multiple_choice')).toHaveLength(2);
    expect(flashcardTypes.filter(t => t === 'fill_in_blank')).toHaveLength(2);

    // Check that each flashcard has required fields
    result.forEach(flashcard => {
      expect(flashcard.id).toBeDefined();
      expect(flashcard.instance_id).toEqual(instance[0].id);
      expect(flashcard.property_id).toBeDefined();
      expect(flashcard.question).toBeDefined();
      expect(flashcard.correct_answer).toBeDefined();
      expect(flashcard.created_at).toBeInstanceOf(Date);
    });

    // Check specific flashcard content
    const trueFalseFlashcards = result.filter(f => f.flashcard_type === 'true_false');
    expect(trueFalseFlashcards[0].question).toMatch(/Is the .+ of 'France' equal to '.+'\?/);
    expect(trueFalseFlashcards[0].correct_answer).toEqual('true');
    expect(trueFalseFlashcards[0].options).toBeNull();

    const multipleChoiceFlashcards = result.filter(f => f.flashcard_type === 'multiple_choice');
    expect(multipleChoiceFlashcards[0].question).toMatch(/What is the .+ of 'France'\?/);
    expect(multipleChoiceFlashcards[0].options).toHaveLength(4);
    expect(multipleChoiceFlashcards[0].options).toContain(multipleChoiceFlashcards[0].correct_answer);

    const fillInBlankFlashcards = result.filter(f => f.flashcard_type === 'fill_in_blank');
    expect(fillInBlankFlashcards[0].question).toMatch(/What is the .+ of 'France'\?/);
    expect(fillInBlankFlashcards[0].options).toBeNull();
  });

  it('should save flashcards to database', async () => {
    // Setup: Create minimal test data
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'TestType',
        description: 'Test type'
      })
      .returning()
      .execute();

    const property = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'test_property',
        property_type: 'string'
      })
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'TestInstance'
      })
      .returning()
      .execute();

    await db.insert(propertyValuesTable)
      .values({
        instance_id: instance[0].id,
        property_id: property[0].id,
        value: 'test_value'
      })
      .execute();

    const input: GenerateFlashcardsInput = {
      instance_id: instance[0].id
    };

    // Execute
    const result = await generateFlashcards(input);

    // Verify flashcards are saved in database
    const savedFlashcards = await db.select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.instance_id, instance[0].id))
      .execute();

    expect(savedFlashcards).toHaveLength(3);
    expect(savedFlashcards.map(f => f.id)).toEqual(result.map(f => f.id));
  });

  it('should generate correct flashcards for different property types', async () => {
    // Setup: Create data type with different property types
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'MixedType',
        description: 'Type with mixed properties'
      })
      .returning()
      .execute();

    const properties = await db.insert(propertiesTable)
      .values([
        {
          type_id: dataType[0].id,
          name: 'name',
          property_type: 'string'
        },
        {
          type_id: dataType[0].id,
          name: 'count',
          property_type: 'number'
        },
        {
          type_id: dataType[0].id,
          name: 'is_active',
          property_type: 'boolean'
        }
      ])
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'TestEntity'
      })
      .returning()
      .execute();

    await db.insert(propertyValuesTable)
      .values([
        {
          instance_id: instance[0].id,
          property_id: properties[0].id,
          value: 'Sample Name'
        },
        {
          instance_id: instance[0].id,
          property_id: properties[1].id,
          value: '42'
        },
        {
          instance_id: instance[0].id,
          property_id: properties[2].id,
          value: 'true'
        }
      ])
      .execute();

    const input: GenerateFlashcardsInput = {
      instance_id: instance[0].id
    };

    // Execute
    const result = await generateFlashcards(input);

    // Verify we have flashcards for all property types
    expect(result).toHaveLength(9); // 3 properties × 3 flashcard types

    // Check string property flashcards (multiple choice and fill-in-blank)
    const stringFlashcards = result.filter(f => f.correct_answer === 'Sample Name');
    expect(stringFlashcards).toHaveLength(2); // multiple_choice and fill_in_blank only
    
    // Check that we have the true/false flashcard for string property
    const stringTrueFalse = result.find(f => 
      f.flashcard_type === 'true_false' && 
      f.question.includes('Sample Name')
    );
    expect(stringTrueFalse).toBeDefined();
    expect(stringTrueFalse!.correct_answer).toEqual('true');

    // Check number property flashcards (multiple choice and fill-in-blank)
    const numberFlashcards = result.filter(f => f.correct_answer === '42');
    expect(numberFlashcards).toHaveLength(2); // multiple_choice and fill_in_blank only
    const numberMultipleChoice = numberFlashcards.find(f => f.flashcard_type === 'multiple_choice');
    expect(numberMultipleChoice?.options).toContain('42');
    expect(numberMultipleChoice?.options).toHaveLength(4);
    
    // Check that we have the true/false flashcard for number property
    const numberTrueFalse = result.find(f => 
      f.flashcard_type === 'true_false' && 
      f.question.includes('42')
    );
    expect(numberTrueFalse).toBeDefined();
    expect(numberTrueFalse!.correct_answer).toEqual('true');

    // Find flashcards specifically for the boolean property
    const booleanPropertyFlashcards = result.filter(f => 
      f.property_id === properties[2].id // The boolean property
    );
    expect(booleanPropertyFlashcards).toHaveLength(3);
    
    // Check the boolean multiple choice specifically
    const booleanMultipleChoice = booleanPropertyFlashcards.find(f => f.flashcard_type === 'multiple_choice');
    expect(booleanMultipleChoice?.correct_answer).toEqual('true');
    expect(booleanMultipleChoice?.options).toContain('true');
    expect(booleanMultipleChoice?.options).toContain('false');
  });

  it('should throw error for non-existent instance', async () => {
    const input: GenerateFlashcardsInput = {
      instance_id: 999999
    };

    await expect(generateFlashcards(input)).rejects.toThrow(/Instance with id 999999 not found/i);
  });

  it('should throw error for instance with no property values', async () => {
    // Create an instance without property values
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'EmptyType',
        description: 'Type without properties'
      })
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'EmptyInstance'
      })
      .returning()
      .execute();

    const input: GenerateFlashcardsInput = {
      instance_id: instance[0].id
    };

    await expect(generateFlashcards(input)).rejects.toThrow(/No property values found for instance/i);
  });

  it('should handle multiple choice options correctly', async () => {
    // Setup with a specific test case for multiple choice validation
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'TestType',
        description: 'Test for multiple choice'
      })
      .returning()
      .execute();

    const property = await db.insert(propertiesTable)
      .values({
        type_id: dataType[0].id,
        name: 'score',
        property_type: 'number'
      })
      .returning()
      .execute();

    const instance = await db.insert(instancesTable)
      .values({
        type_id: dataType[0].id,
        name: 'TestItem'
      })
      .returning()
      .execute();

    await db.insert(propertyValuesTable)
      .values({
        instance_id: instance[0].id,
        property_id: property[0].id,
        value: '100'
      })
      .execute();

    const input: GenerateFlashcardsInput = {
      instance_id: instance[0].id
    };

    // Execute
    const result = await generateFlashcards(input);

    // Find the multiple choice flashcard
    const multipleChoice = result.find(f => f.flashcard_type === 'multiple_choice');
    expect(multipleChoice).toBeDefined();
    expect(multipleChoice!.correct_answer).toEqual('100');
    expect(multipleChoice!.options).toHaveLength(4);
    expect(multipleChoice!.options).toContain('100');
    
    // Options should contain the correct answer and 3 other distinct values
    const uniqueOptions = new Set(multipleChoice!.options);
    expect(uniqueOptions.size).toEqual(4);
  });
});