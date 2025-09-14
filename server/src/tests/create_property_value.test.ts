import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dataTypesTable, propertiesTable, instancesTable, propertyValuesTable } from '../db/schema';
import { type CreatePropertyValueInput } from '../schema';
import { createPropertyValue } from '../handlers/create_property_value';
import { eq } from 'drizzle-orm';

describe('createPropertyValue', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const setupTestData = async () => {
    // Create a data type
    const dataTypeResult = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'A country data type'
      })
      .returning()
      .execute();
    const dataType = dataTypeResult[0];

    // Create a property
    const propertyResult = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'Capital',
        property_type: 'string'
      })
      .returning()
      .execute();
    const property = propertyResult[0];

    // Create an instance
    const instanceResult = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'France'
      })
      .returning()
      .execute();
    const instance = instanceResult[0];

    return { dataType, property, instance };
  };

  it('should create a property value', async () => {
    const { property, instance } = await setupTestData();

    const testInput: CreatePropertyValueInput = {
      instance_id: instance.id,
      property_id: property.id,
      value: 'Paris'
    };

    const result = await createPropertyValue(testInput);

    // Basic field validation
    expect(result.instance_id).toEqual(instance.id);
    expect(result.property_id).toEqual(property.id);
    expect(result.value).toEqual('Paris');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save property value to database', async () => {
    const { property, instance } = await setupTestData();

    const testInput: CreatePropertyValueInput = {
      instance_id: instance.id,
      property_id: property.id,
      value: 'Paris'
    };

    const result = await createPropertyValue(testInput);

    // Query the database to verify the property value was saved
    const propertyValues = await db.select()
      .from(propertyValuesTable)
      .where(eq(propertyValuesTable.id, result.id))
      .execute();

    expect(propertyValues).toHaveLength(1);
    expect(propertyValues[0].instance_id).toEqual(instance.id);
    expect(propertyValues[0].property_id).toEqual(property.id);
    expect(propertyValues[0].value).toEqual('Paris');
    expect(propertyValues[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different value types as strings', async () => {
    const { dataType } = await setupTestData();

    // Create properties with different types
    const numberPropertyResult = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'Population',
        property_type: 'number'
      })
      .returning()
      .execute();
    const numberProperty = numberPropertyResult[0];

    const booleanPropertyResult = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'EU Member',
        property_type: 'boolean'
      })
      .returning()
      .execute();
    const booleanProperty = booleanPropertyResult[0];

    // Create an instance
    const instanceResult = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'Germany'
      })
      .returning()
      .execute();
    const instance = instanceResult[0];

    // Test number value stored as string
    const numberInput: CreatePropertyValueInput = {
      instance_id: instance.id,
      property_id: numberProperty.id,
      value: '83000000'
    };

    const numberResult = await createPropertyValue(numberInput);
    expect(numberResult.value).toEqual('83000000');

    // Test boolean value stored as string
    const booleanInput: CreatePropertyValueInput = {
      instance_id: instance.id,
      property_id: booleanProperty.id,
      value: 'true'
    };

    const booleanResult = await createPropertyValue(booleanInput);
    expect(booleanResult.value).toEqual('true');
  });

  it('should throw error when instance does not exist', async () => {
    const { property } = await setupTestData();

    const testInput: CreatePropertyValueInput = {
      instance_id: 999, // Non-existent instance ID
      property_id: property.id,
      value: 'Paris'
    };

    await expect(createPropertyValue(testInput)).rejects.toThrow(/instance with id 999 does not exist/i);
  });

  it('should throw error when property does not exist', async () => {
    const { instance } = await setupTestData();

    const testInput: CreatePropertyValueInput = {
      instance_id: instance.id,
      property_id: 999, // Non-existent property ID
      value: 'Paris'
    };

    await expect(createPropertyValue(testInput)).rejects.toThrow(/property with id 999 does not exist/i);
  });

  it('should allow multiple property values for the same instance', async () => {
    const { dataType } = await setupTestData();

    // Create multiple properties
    const capitalPropertyResult = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'Capital',
        property_type: 'string'
      })
      .returning()
      .execute();
    const capitalProperty = capitalPropertyResult[0];

    const populationPropertyResult = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'Population',
        property_type: 'number'
      })
      .returning()
      .execute();
    const populationProperty = populationPropertyResult[0];

    // Create an instance
    const instanceResult = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'Spain'
      })
      .returning()
      .execute();
    const instance = instanceResult[0];

    // Create multiple property values for the same instance
    const capitalInput: CreatePropertyValueInput = {
      instance_id: instance.id,
      property_id: capitalProperty.id,
      value: 'Madrid'
    };

    const populationInput: CreatePropertyValueInput = {
      instance_id: instance.id,
      property_id: populationProperty.id,
      value: '47000000'
    };

    const capitalResult = await createPropertyValue(capitalInput);
    const populationResult = await createPropertyValue(populationInput);

    expect(capitalResult.value).toEqual('Madrid');
    expect(populationResult.value).toEqual('47000000');

    // Verify both property values exist in database
    const propertyValues = await db.select()
      .from(propertyValuesTable)
      .where(eq(propertyValuesTable.instance_id, instance.id))
      .execute();

    expect(propertyValues).toHaveLength(2);
  });
});