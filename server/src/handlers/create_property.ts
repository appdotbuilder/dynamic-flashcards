import { db } from '../db';
import { propertiesTable, dataTypesTable } from '../db/schema';
import { type CreatePropertyInput, type Property } from '../schema';
import { eq } from 'drizzle-orm';

export async function createProperty(input: CreatePropertyInput): Promise<Property> {
  try {
    // Verify that the data type exists before creating a property
    const existingDataType = await db.select()
      .from(dataTypesTable)
      .where(eq(dataTypesTable.id, input.type_id))
      .execute();

    if (existingDataType.length === 0) {
      throw new Error(`Data type with ID ${input.type_id} does not exist`);
    }

    // Insert the new property
    const result = await db.insert(propertiesTable)
      .values({
        type_id: input.type_id,
        name: input.name,
        property_type: input.property_type
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Property creation failed:', error);
    throw error;
  }
}