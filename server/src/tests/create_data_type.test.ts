import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dataTypesTable } from '../db/schema';
import { type CreateDataTypeInput } from '../schema';
import { createDataType } from '../handlers/create_data_type';
import { eq } from 'drizzle-orm';

// Test input with description
const testInputWithDescription: CreateDataTypeInput = {
  name: 'Country',
  description: 'A geographic nation or territory'
};

// Test input without description
const testInputWithoutDescription: CreateDataTypeInput = {
  name: 'Quantity'
};

describe('createDataType', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a data type with description', async () => {
    const result = await createDataType(testInputWithDescription);

    // Basic field validation
    expect(result.name).toEqual('Country');
    expect(result.description).toEqual('A geographic nation or territory');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a data type without description', async () => {
    const result = await createDataType(testInputWithoutDescription);

    // Basic field validation
    expect(result.name).toEqual('Quantity');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save data type to database', async () => {
    const result = await createDataType(testInputWithDescription);

    // Query using proper drizzle syntax
    const dataTypes = await db.select()
      .from(dataTypesTable)
      .where(eq(dataTypesTable.id, result.id))
      .execute();

    expect(dataTypes).toHaveLength(1);
    expect(dataTypes[0].name).toEqual('Country');
    expect(dataTypes[0].description).toEqual('A geographic nation or territory');
    expect(dataTypes[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple unique data types', async () => {
    const countryResult = await createDataType(testInputWithDescription);
    const quantityResult = await createDataType(testInputWithoutDescription);

    // Verify different IDs
    expect(countryResult.id).not.toEqual(quantityResult.id);

    // Query all data types
    const allDataTypes = await db.select()
      .from(dataTypesTable)
      .execute();

    expect(allDataTypes).toHaveLength(2);
    
    // Find each data type
    const countryType = allDataTypes.find(dt => dt.name === 'Country');
    const quantityType = allDataTypes.find(dt => dt.name === 'Quantity');

    expect(countryType).toBeDefined();
    expect(countryType?.description).toEqual('A geographic nation or territory');
    expect(quantityType).toBeDefined();
    expect(quantityType?.description).toBeNull();
  });

  it('should handle empty string description as null', async () => {
    const inputWithEmptyDescription: CreateDataTypeInput = {
      name: 'TestType',
      description: ''
    };

    const result = await createDataType(inputWithEmptyDescription);

    expect(result.name).toEqual('TestType');
    expect(result.description).toBeNull();

    // Verify in database
    const dataTypes = await db.select()
      .from(dataTypesTable)
      .where(eq(dataTypesTable.id, result.id))
      .execute();

    expect(dataTypes[0].description).toBeNull();
  });
});