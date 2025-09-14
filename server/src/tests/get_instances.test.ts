import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dataTypesTable, propertiesTable, instancesTable, propertyValuesTable } from '../db/schema';
import { getInstances } from '../handlers/get_instances';

describe('getInstances', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no instances exist', async () => {
    const result = await getInstances();
    expect(result).toEqual([]);
  });

  it('should return instances without property values when none exist', async () => {
    // Create data type
    const [dataType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    // Create instance without property values
    const [instance] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'France'
      })
      .returning()
      .execute();

    const result = await getInstances();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: instance.id,
      type_id: dataType.id,
      name: 'France',
      created_at: instance.created_at,
      property_values: []
    });
  });

  it('should return instances with their property values', async () => {
    // Create data type
    const [dataType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    // Create properties
    const [capitalProperty] = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'capital',
        property_type: 'string'
      })
      .returning()
      .execute();

    const [populationProperty] = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'population',
        property_type: 'number'
      })
      .returning()
      .execute();

    // Create instance
    const [instance] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'France'
      })
      .returning()
      .execute();

    // Create property values
    const [capitalValue] = await db.insert(propertyValuesTable)
      .values({
        instance_id: instance.id,
        property_id: capitalProperty.id,
        value: 'Paris'
      })
      .returning()
      .execute();

    const [populationValue] = await db.insert(propertyValuesTable)
      .values({
        instance_id: instance.id,
        property_id: populationProperty.id,
        value: '67000000'
      })
      .returning()
      .execute();

    const result = await getInstances();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(instance.id);
    expect(result[0].name).toEqual('France');
    expect(result[0].type_id).toEqual(dataType.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].property_values).toHaveLength(2);

    // Check property values are included with property details
    const capitalPropertyValue = result[0].property_values.find(pv => pv.property.name === 'capital');
    expect(capitalPropertyValue).toBeDefined();
    expect(capitalPropertyValue!.value).toEqual('Paris');
    expect(capitalPropertyValue!.property.property_type).toEqual('string');

    const populationPropertyValue = result[0].property_values.find(pv => pv.property.name === 'population');
    expect(populationPropertyValue).toBeDefined();
    expect(populationPropertyValue!.value).toEqual('67000000');
    expect(populationPropertyValue!.property.property_type).toEqual('number');
  });

  it('should return multiple instances with their respective property values', async () => {
    // Create data type
    const [dataType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    // Create property
    const [capitalProperty] = await db.insert(propertiesTable)
      .values({
        type_id: dataType.id,
        name: 'capital',
        property_type: 'string'
      })
      .returning()
      .execute();

    // Create instances
    const [franceInstance] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'France'
      })
      .returning()
      .execute();

    const [germanyInstance] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'Germany'
      })
      .returning()
      .execute();

    // Create property values
    await db.insert(propertyValuesTable)
      .values({
        instance_id: franceInstance.id,
        property_id: capitalProperty.id,
        value: 'Paris'
      })
      .execute();

    await db.insert(propertyValuesTable)
      .values({
        instance_id: germanyInstance.id,
        property_id: capitalProperty.id,
        value: 'Berlin'
      })
      .execute();

    const result = await getInstances();

    expect(result).toHaveLength(2);

    const france = result.find(i => i.name === 'France');
    const germany = result.find(i => i.name === 'Germany');

    expect(france).toBeDefined();
    expect(germany).toBeDefined();
    
    expect(france!.property_values).toHaveLength(1);
    expect(france!.property_values[0].value).toEqual('Paris');
    
    expect(germany!.property_values).toHaveLength(1);
    expect(germany!.property_values[0].value).toEqual('Berlin');
  });

  it('should handle instances from different data types', async () => {
    // Create two different data types
    const [countryType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    const [productType] = await db.insert(dataTypesTable)
      .values({
        name: 'Product',
        description: 'Commercial products'
      })
      .returning()
      .execute();

    // Create instances for different types
    const [countryInstance] = await db.insert(instancesTable)
      .values({
        type_id: countryType.id,
        name: 'France'
      })
      .returning()
      .execute();

    const [productInstance] = await db.insert(instancesTable)
      .values({
        type_id: productType.id,
        name: 'Laptop'
      })
      .returning()
      .execute();

    const result = await getInstances();

    expect(result).toHaveLength(2);
    
    const france = result.find(i => i.name === 'France');
    const laptop = result.find(i => i.name === 'Laptop');

    expect(france).toBeDefined();
    expect(laptop).toBeDefined();
    expect(france!.type_id).toEqual(countryType.id);
    expect(laptop!.type_id).toEqual(productType.id);
  });

  it('should handle property values with different property types', async () => {
    // Create data type
    const [dataType] = await db.insert(dataTypesTable)
      .values({
        name: 'Country',
        description: 'Geographic countries'
      })
      .returning()
      .execute();

    // Create properties with different types
    const properties = await db.insert(propertiesTable)
      .values([
        {
          type_id: dataType.id,
          name: 'name',
          property_type: 'string'
        },
        {
          type_id: dataType.id,
          name: 'population',
          property_type: 'number'
        },
        {
          type_id: dataType.id,
          name: 'is_eu_member',
          property_type: 'boolean'
        }
      ])
      .returning()
      .execute();

    // Create instance
    const [instance] = await db.insert(instancesTable)
      .values({
        type_id: dataType.id,
        name: 'France'
      })
      .returning()
      .execute();

    // Create property values for all types
    await db.insert(propertyValuesTable)
      .values([
        {
          instance_id: instance.id,
          property_id: properties[0].id,
          value: 'République française'
        },
        {
          instance_id: instance.id,
          property_id: properties[1].id,
          value: '67000000'
        },
        {
          instance_id: instance.id,
          property_id: properties[2].id,
          value: 'true'
        }
      ])
      .execute();

    const result = await getInstances();

    expect(result).toHaveLength(1);
    expect(result[0].property_values).toHaveLength(3);

    const stringProp = result[0].property_values.find(pv => pv.property.property_type === 'string');
    const numberProp = result[0].property_values.find(pv => pv.property.property_type === 'number');
    const booleanProp = result[0].property_values.find(pv => pv.property.property_type === 'boolean');

    expect(stringProp).toBeDefined();
    expect(stringProp!.value).toEqual('République française');
    
    expect(numberProp).toBeDefined();
    expect(numberProp!.value).toEqual('67000000');
    
    expect(booleanProp).toBeDefined();
    expect(booleanProp!.value).toEqual('true');
  });
});