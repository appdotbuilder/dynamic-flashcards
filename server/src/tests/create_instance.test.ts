import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { instancesTable, dataTypesTable } from '../db/schema';
import { type CreateInstanceInput } from '../schema';
import { createInstance } from '../handlers/create_instance';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateInstanceInput = {
  type_id: 1, // Will be set to actual ID after creating data type
  name: 'France'
};

describe('createInstance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an instance', async () => {
    // Create prerequisite data type first
    const dataTypeResult = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Countries around the world'
      })
      .returning()
      .execute();

    const inputWithValidTypeId: CreateInstanceInput = {
      ...testInput,
      type_id: dataTypeResult[0].id
    };

    const result = await createInstance(inputWithValidTypeId);

    // Basic field validation
    expect(result.name).toEqual('France');
    expect(result.type_id).toEqual(dataTypeResult[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save instance to database', async () => {
    // Create prerequisite data type first
    const dataTypeResult = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Countries around the world'
      })
      .returning()
      .execute();

    const inputWithValidTypeId: CreateInstanceInput = {
      ...testInput,
      type_id: dataTypeResult[0].id
    };

    const result = await createInstance(inputWithValidTypeId);

    // Query using proper drizzle syntax
    const instances = await db.select()
      .from(instancesTable)
      .where(eq(instancesTable.id, result.id))
      .execute();

    expect(instances).toHaveLength(1);
    expect(instances[0].name).toEqual('France');
    expect(instances[0].type_id).toEqual(dataTypeResult[0].id);
    expect(instances[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple instances for the same data type', async () => {
    // Create prerequisite data type first
    const dataTypeResult = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Countries around the world'
      })
      .returning()
      .execute();

    const typeId = dataTypeResult[0].id;

    // Create multiple instances
    const france = await createInstance({ type_id: typeId, name: 'France' });
    const germany = await createInstance({ type_id: typeId, name: 'Germany' });
    const spain = await createInstance({ type_id: typeId, name: 'Spain' });

    // Verify all instances were created with different IDs
    expect(france.id).not.toEqual(germany.id);
    expect(france.id).not.toEqual(spain.id);
    expect(germany.id).not.toEqual(spain.id);

    // Verify all have the same type_id
    expect(france.type_id).toEqual(typeId);
    expect(germany.type_id).toEqual(typeId);
    expect(spain.type_id).toEqual(typeId);

    // Query all instances for this type
    const instances = await db.select()
      .from(instancesTable)
      .where(eq(instancesTable.type_id, typeId))
      .execute();

    expect(instances).toHaveLength(3);
    const names = instances.map(instance => instance.name);
    expect(names).toContain('France');
    expect(names).toContain('Germany');
    expect(names).toContain('Spain');
  });

  it('should throw error when data type does not exist', async () => {
    const inputWithInvalidTypeId: CreateInstanceInput = {
      type_id: 999, // Non-existent type ID
      name: 'France'
    };

    await expect(createInstance(inputWithInvalidTypeId))
      .rejects.toThrow(/Data type with id 999 not found/i);
  });

  it('should create instance with different data types', async () => {
    // Create two different data types
    const countryType = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Countries around the world'
      })
      .returning()
      .execute();

    const cityType = await db.insert(dataTypesTable)
      .values({
        name: 'City',
        description: 'Cities around the world'
      })
      .returning()
      .execute();

    // Create instances for each type
    const france = await createInstance({
      type_id: countryType[0].id,
      name: 'France'
    });

    const paris = await createInstance({
      type_id: cityType[0].id,
      name: 'Paris'
    });

    // Verify correct type associations
    expect(france.type_id).toEqual(countryType[0].id);
    expect(paris.type_id).toEqual(cityType[0].id);

    // Verify instances exist in database
    const allInstances = await db.select()
      .from(instancesTable)
      .execute();

    expect(allInstances).toHaveLength(2);
    
    const franceRecord = allInstances.find(inst => inst.name === 'France');
    const parisRecord = allInstances.find(inst => inst.name === 'Paris');
    
    expect(franceRecord?.type_id).toEqual(countryType[0].id);
    expect(parisRecord?.type_id).toEqual(cityType[0].id);
  });
});