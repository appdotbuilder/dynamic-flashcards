import { db } from '../db';
import { propertyValuesTable, instancesTable, propertiesTable } from '../db/schema';
import { type CreatePropertyValueInput, type PropertyValue } from '../schema';
import { eq } from 'drizzle-orm';

export async function createPropertyValue(input: CreatePropertyValueInput): Promise<PropertyValue> {
  try {
    // Verify that the instance exists
    const instanceExists = await db.select()
      .from(instancesTable)
      .where(eq(instancesTable.id, input.instance_id))
      .execute();

    if (instanceExists.length === 0) {
      throw new Error(`Instance with id ${input.instance_id} does not exist`);
    }

    // Verify that the property exists
    const propertyExists = await db.select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, input.property_id))
      .execute();

    if (propertyExists.length === 0) {
      throw new Error(`Property with id ${input.property_id} does not exist`);
    }

    // Insert property value record
    const result = await db.insert(propertyValuesTable)
      .values({
        instance_id: input.instance_id,
        property_id: input.property_id,
        value: input.value
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Property value creation failed:', error);
    throw error;
  }
}