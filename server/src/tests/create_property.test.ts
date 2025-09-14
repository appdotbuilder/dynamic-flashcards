import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { propertiesTable, dataTypesTable } from '../db/schema';
import { type CreatePropertyInput } from '../schema';
import { createProperty } from '../handlers/create_property';
import { eq } from 'drizzle-orm';

describe('createProperty', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testDataTypeId: number;

  beforeEach(async () => {
    // Create a test data type for property creation
    const dataType = await db.insert(dataTypesTable)
      .values({
        name: 'Test Data Type',
        description: 'A data type for testing'
      })
      .returning()
      .execute();
    
    testDataTypeId = dataType[0].id;
  });

  it('should create a property with string type', async () => {
    const testInput: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Test String Property',
      property_type: 'string'
    };

    const result = await createProperty(testInput);

    // Verify basic field values
    expect(result.type_id).toEqual(testDataTypeId);
    expect(result.name).toEqual('Test String Property');
    expect(result.property_type).toEqual('string');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a property with number type', async () => {
    const testInput: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Population',
      property_type: 'number'
    };

    const result = await createProperty(testInput);

    expect(result.type_id).toEqual(testDataTypeId);
    expect(result.name).toEqual('Population');
    expect(result.property_type).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a property with boolean type', async () => {
    const testInput: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Is Active',
      property_type: 'boolean'
    };

    const result = await createProperty(testInput);

    expect(result.type_id).toEqual(testDataTypeId);
    expect(result.name).toEqual('Is Active');
    expect(result.property_type).toEqual('boolean');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save property to database', async () => {
    const testInput: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Capital City',
      property_type: 'string'
    };

    const result = await createProperty(testInput);

    // Query the database to verify the property was saved
    const properties = await db.select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, result.id))
      .execute();

    expect(properties).toHaveLength(1);
    expect(properties[0].type_id).toEqual(testDataTypeId);
    expect(properties[0].name).toEqual('Capital City');
    expect(properties[0].property_type).toEqual('string');
    expect(properties[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple properties for the same data type', async () => {
    const firstProperty: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Capital',
      property_type: 'string'
    };

    const secondProperty: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Population',
      property_type: 'number'
    };

    const thirdProperty: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Is EU Member',
      property_type: 'boolean'
    };

    // Create all three properties
    const result1 = await createProperty(firstProperty);
    const result2 = await createProperty(secondProperty);
    const result3 = await createProperty(thirdProperty);

    // Verify all properties have different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).not.toEqual(result3.id);
    expect(result2.id).not.toEqual(result3.id);

    // Verify all properties belong to the same data type
    expect(result1.type_id).toEqual(testDataTypeId);
    expect(result2.type_id).toEqual(testDataTypeId);
    expect(result3.type_id).toEqual(testDataTypeId);

    // Query database to verify all properties exist
    const properties = await db.select()
      .from(propertiesTable)
      .where(eq(propertiesTable.type_id, testDataTypeId))
      .execute();

    expect(properties).toHaveLength(3);
  });

  it('should throw error when data type does not exist', async () => {
    const testInput: CreatePropertyInput = {
      type_id: 99999, // Non-existent data type ID
      name: 'Invalid Property',
      property_type: 'string'
    };

    await expect(createProperty(testInput)).rejects.toThrow(/Data type with ID 99999 does not exist/i);
  });

  it('should handle property names with special characters', async () => {
    const testInput: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Property with "quotes" & symbols!',
      property_type: 'string'
    };

    const result = await createProperty(testInput);

    expect(result.name).toEqual('Property with "quotes" & symbols!');
    expect(result.id).toBeDefined();

    // Verify it was saved correctly in the database
    const properties = await db.select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, result.id))
      .execute();

    expect(properties[0].name).toEqual('Property with "quotes" & symbols!');
  });

  it('should verify created_at timestamp is recent', async () => {
    const beforeCreation = new Date();
    
    const testInput: CreatePropertyInput = {
      type_id: testDataTypeId,
      name: 'Time Test Property',
      property_type: 'string'
    };

    const result = await createProperty(testInput);
    
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});