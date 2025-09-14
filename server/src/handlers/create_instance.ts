import { db } from '../db';
import { instancesTable, dataTypesTable } from '../db/schema';
import { type CreateInstanceInput, type Instance } from '../schema';
import { eq } from 'drizzle-orm';

export const createInstance = async (input: CreateInstanceInput): Promise<Instance> => {
  try {
    // Verify the data type exists to prevent foreign key constraint violations
    const dataType = await db.select()
      .from(dataTypesTable)
      .where(eq(dataTypesTable.id, input.type_id))
      .execute();

    if (dataType.length === 0) {
      throw new Error(`Data type with id ${input.type_id} not found`);
    }

    // Insert instance record
    const result = await db.insert(instancesTable)
      .values({
        type_id: input.type_id,
        name: input.name
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Instance creation failed:', error);
    throw error;
  }
};