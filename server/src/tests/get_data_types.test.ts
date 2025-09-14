import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dataTypesTable, propertiesTable } from '../db/schema';
import { getDataTypes } from '../handlers/get_data_types';

describe('getDataTypes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no data types exist', async () => {
    const result = await getDataTypes();
    expect(result).toEqual([]);
  });

  it('should return data type with no properties', async () => {
    // Create a data type without properties
    await db.insert(dataTypesTable)
      .values({
        name: 'Empty Type',
        description: 'A type with no properties'
      })
      .execute();

    const result = await getDataTypes();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Empty Type');
    expect(result[0].description).toEqual('A type with no properties');
    expect(result[0].properties).toEqual([]);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return data type with properties', async () => {
    // Create a data type
    const dataTypeResult = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic country data'
      })
      .returning()
      .execute();

    const dataType = dataTypeResult[0];

    // Create properties for the data type
    await db.insert(propertiesTable)
      .values([
        {
          type_id: dataType.id,
          name: 'Capital',
          property_type: 'string'
        },
        {
          type_id: dataType.id,
          name: 'Population',
          property_type: 'number'
        }
      ])
      .execute();

    const result = await getDataTypes();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Country');
    expect(result[0].description).toEqual('Geographic country data');
    expect(result[0].properties).toHaveLength(2);
    
    // Check properties are included
    const properties = result[0].properties;
    expect(properties.find(p => p.name === 'Capital')).toBeDefined();
    expect(properties.find(p => p.name === 'Population')).toBeDefined();
    expect(properties.find(p => p.name === 'Capital')?.property_type).toEqual('string');
    expect(properties.find(p => p.name === 'Population')?.property_type).toEqual('number');
  });

  it('should return multiple data types with their properties', async () => {
    // Create first data type
    const countryResult = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic country data'
      })
      .returning()
      .execute();

    // Create second data type
    const productResult = await db.insert(dataTypesTable)
      .values({
        name: 'Product',
        description: null // Test nullable description
      })
      .returning()
      .execute();

    const country = countryResult[0];
    const product = productResult[0];

    // Create properties for both types
    await db.insert(propertiesTable)
      .values([
        {
          type_id: country.id,
          name: 'Capital',
          property_type: 'string'
        },
        {
          type_id: product.id,
          name: 'Price',
          property_type: 'number'
        },
        {
          type_id: product.id,
          name: 'In Stock',
          property_type: 'boolean'
        }
      ])
      .execute();

    const result = await getDataTypes();

    expect(result).toHaveLength(2);
    
    // Find each data type
    const countryType = result.find(dt => dt.name === 'Country');
    const productType = result.find(dt => dt.name === 'Product');

    expect(countryType).toBeDefined();
    expect(productType).toBeDefined();

    // Check country type
    expect(countryType?.description).toEqual('Geographic country data');
    expect(countryType?.properties).toHaveLength(1);
    expect(countryType?.properties[0].name).toEqual('Capital');

    // Check product type
    expect(productType?.description).toBeNull();
    expect(productType?.properties).toHaveLength(2);
    const productProperties = productType?.properties || [];
    expect(productProperties.find(p => p.name === 'Price')?.property_type).toEqual('number');
    expect(productProperties.find(p => p.name === 'In Stock')?.property_type).toEqual('boolean');
  });

  it('should return results sorted by creation date', async () => {
    // Create data types with slight delay to ensure different timestamps
    await db.insert(dataTypesTable)
      .values({
        name: 'First Type',
        description: 'Created first'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(dataTypesTable)
      .values({
        name: 'Second Type',
        description: 'Created second'
      })
      .execute();

    const result = await getDataTypes();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First Type');
    expect(result[1].name).toEqual('Second Type');
    expect(result[0].created_at.getTime()).toBeLessThan(result[1].created_at.getTime());
  });

  it('should handle all property types correctly', async () => {
    // Create a data type
    const dataTypeResult = await db.insert(dataTypesTable)
      .values({
        name: 'Test Type',
        description: 'Testing all property types'
      })
      .returning()
      .execute();

    const dataType = dataTypeResult[0];

    // Create properties with all possible types
    await db.insert(propertiesTable)
      .values([
        {
          type_id: dataType.id,
          name: 'Name',
          property_type: 'string'
        },
        {
          type_id: dataType.id,
          name: 'Count',
          property_type: 'number'
        },
        {
          type_id: dataType.id,
          name: 'Active',
          property_type: 'boolean'
        }
      ])
      .execute();

    const result = await getDataTypes();

    expect(result).toHaveLength(1);
    expect(result[0].properties).toHaveLength(3);
    
    const properties = result[0].properties;
    expect(properties.find(p => p.property_type === 'string')).toBeDefined();
    expect(properties.find(p => p.property_type === 'number')).toBeDefined();
    expect(properties.find(p => p.property_type === 'boolean')).toBeDefined();
  });
});