import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dataTypesTable, propertiesTable, instancesTable, propertyValuesTable } from '../db/schema';
import { getInstancesByType } from '../handlers/get_instances_by_type';

describe('getInstancesByType', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no instances exist for type', async () => {
    // Create a data type but no instances
    const dataTypes = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    const result = await getInstancesByType(dataTypes[0].id);

    expect(result).toEqual([]);
  });

  it('should return instances without property values when none exist', async () => {
    // Create a data type and instance but no properties/values
    const dataTypes = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    const instances = await db.insert(instancesTable)
      .values({
        type_id: dataTypes[0].id,
        name: 'United States'
      })
      .returning()
      .execute();

    const result = await getInstancesByType(dataTypes[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(instances[0].id);
    expect(result[0].name).toEqual('United States');
    expect(result[0].type_id).toEqual(dataTypes[0].id);
    expect(result[0].property_values).toEqual([]);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return instances with property values', async () => {
    // Create a complete structure: data type -> properties -> instances -> property values
    const dataTypes = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    const properties = await db.insert(propertiesTable)
      .values([
        {
          type_id: dataTypes[0].id,
          name: 'Population',
          property_type: 'number'
        },
        {
          type_id: dataTypes[0].id,
          name: 'Capital',
          property_type: 'string'
        }
      ])
      .returning()
      .execute();

    const instances = await db.insert(instancesTable)
      .values({
        type_id: dataTypes[0].id,
        name: 'United States'
      })
      .returning()
      .execute();

    await db.insert(propertyValuesTable)
      .values([
        {
          instance_id: instances[0].id,
          property_id: properties[0].id, // Population
          value: '331900000'
        },
        {
          instance_id: instances[0].id,
          property_id: properties[1].id, // Capital
          value: 'Washington, D.C.'
        }
      ])
      .execute();

    const result = await getInstancesByType(dataTypes[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(instances[0].id);
    expect(result[0].name).toEqual('United States');
    expect(result[0].type_id).toEqual(dataTypes[0].id);
    expect(result[0].property_values).toHaveLength(2);

    // Check property values structure
    const populationValue = result[0].property_values.find(pv => pv.property.name === 'Population');
    expect(populationValue).toBeDefined();
    expect(populationValue?.value).toEqual('331900000');
    expect(populationValue?.property.property_type).toEqual('number');

    const capitalValue = result[0].property_values.find(pv => pv.property.name === 'Capital');
    expect(capitalValue).toBeDefined();
    expect(capitalValue?.value).toEqual('Washington, D.C.');
    expect(capitalValue?.property.property_type).toEqual('string');
  });

  it('should return multiple instances with their respective property values', async () => {
    // Create data type and properties
    const dataTypes = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    const properties = await db.insert(propertiesTable)
      .values({
        type_id: dataTypes[0].id,
        name: 'Population',
        property_type: 'number'
      })
      .returning()
      .execute();

    // Create multiple instances
    const instances = await db.insert(instancesTable)
      .values([
        {
          type_id: dataTypes[0].id,
          name: 'United States'
        },
        {
          type_id: dataTypes[0].id,
          name: 'Canada'
        }
      ])
      .returning()
      .execute();

    // Add property values for each instance
    await db.insert(propertyValuesTable)
      .values([
        {
          instance_id: instances[0].id,
          property_id: properties[0].id,
          value: '331900000'
        },
        {
          instance_id: instances[1].id,
          property_id: properties[0].id,
          value: '38000000'
        }
      ])
      .execute();

    const result = await getInstancesByType(dataTypes[0].id);

    expect(result).toHaveLength(2);
    
    // Check first instance
    const usInstance = result.find(r => r.name === 'United States');
    expect(usInstance).toBeDefined();
    expect(usInstance?.property_values).toHaveLength(1);
    expect(usInstance?.property_values[0].value).toEqual('331900000');

    // Check second instance
    const canadaInstance = result.find(r => r.name === 'Canada');
    expect(canadaInstance).toBeDefined();
    expect(canadaInstance?.property_values).toHaveLength(1);
    expect(canadaInstance?.property_values[0].value).toEqual('38000000');
  });

  it('should return empty array for non-existent type_id', async () => {
    const result = await getInstancesByType(99999);

    expect(result).toEqual([]);
  });

  it('should handle instances with mixed property coverage', async () => {
    // Create data type and properties
    const dataTypes = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    const properties = await db.insert(propertiesTable)
      .values([
        {
          type_id: dataTypes[0].id,
          name: 'Population',
          property_type: 'number'
        },
        {
          type_id: dataTypes[0].id,
          name: 'Capital',
          property_type: 'string'
        }
      ])
      .returning()
      .execute();

    // Create instances
    const instances = await db.insert(instancesTable)
      .values([
        {
          type_id: dataTypes[0].id,
          name: 'Complete Country' // Will have all properties
        },
        {
          type_id: dataTypes[0].id,
          name: 'Partial Country' // Will have only one property
        }
      ])
      .returning()
      .execute();

    // Add property values - complete for first, partial for second
    await db.insert(propertyValuesTable)
      .values([
        {
          instance_id: instances[0].id,
          property_id: properties[0].id, // Population
          value: '1000000'
        },
        {
          instance_id: instances[0].id,
          property_id: properties[1].id, // Capital
          value: 'Complete City'
        },
        {
          instance_id: instances[1].id,
          property_id: properties[0].id, // Population only
          value: '500000'
        }
      ])
      .execute();

    const result = await getInstancesByType(dataTypes[0].id);

    expect(result).toHaveLength(2);
    
    const completeCountry = result.find(r => r.name === 'Complete Country');
    expect(completeCountry?.property_values).toHaveLength(2);
    
    const partialCountry = result.find(r => r.name === 'Partial Country');
    expect(partialCountry?.property_values).toHaveLength(1);
    expect(partialCountry?.property_values[0].property.name).toEqual('Population');
  });
});