import { db } from '../db';
import { dataTypesTable, propertiesTable } from '../db/schema';
import { type DataTypeWithProperties } from '../schema';
import { eq } from 'drizzle-orm';

export const getDataTypes = async (): Promise<DataTypeWithProperties[]> => {
  try {
    // Get all data types with their associated properties using a join
    const results = await db.select()
      .from(dataTypesTable)
      .leftJoin(propertiesTable, eq(dataTypesTable.id, propertiesTable.type_id))
      .execute();

    // Group results by data type and build the nested structure
    const dataTypeMap = new Map<number, DataTypeWithProperties>();

    for (const result of results) {
      const dataType = result.data_types;
      const property = result.properties;

      if (!dataTypeMap.has(dataType.id)) {
        dataTypeMap.set(dataType.id, {
          ...dataType,
          properties: []
        });
      }

      // Add property if it exists (left join may return null properties)
      if (property) {
        dataTypeMap.get(dataType.id)!.properties.push(property);
      }
    }

    // Convert map to array and sort by created_at for consistent ordering
    return Array.from(dataTypeMap.values())
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  } catch (error) {
    console.error('Failed to get data types:', error);
    throw error;
  }
};