import { db } from '../db';
import { dataTypesTable } from '../db/schema';
import { type CreateDataTypeInput, type DataType } from '../schema';

export const createDataType = async (input: CreateDataTypeInput): Promise<DataType> => {
  try {
    // Insert data type record
    const result = await db.insert(dataTypesTable)
      .values({
        name: input.name,
        description: input.description || null
      })
      .returning()
      .execute();

    // Return the created data type
    const dataType = result[0];
    return dataType;
  } catch (error) {
    console.error('Data type creation failed:', error);
    throw error;
  }
};