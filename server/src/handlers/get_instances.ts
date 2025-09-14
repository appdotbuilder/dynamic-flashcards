import { db } from '../db';
import { instancesTable, propertyValuesTable, propertiesTable } from '../db/schema';
import { type InstanceWithValues } from '../schema';
import { eq } from 'drizzle-orm';

export async function getInstances(): Promise<InstanceWithValues[]> {
  try {
    // Get all instances with their property values and property details
    const results = await db.select()
      .from(instancesTable)
      .leftJoin(propertyValuesTable, eq(instancesTable.id, propertyValuesTable.instance_id))
      .leftJoin(propertiesTable, eq(propertyValuesTable.property_id, propertiesTable.id))
      .execute();

    // Group results by instance to build the nested structure
    const instanceMap = new Map<number, InstanceWithValues>();

    for (const result of results) {
      const instance = result.instances;
      const propertyValue = result.property_values;
      const property = result.properties;

      // Initialize instance if not seen before
      if (!instanceMap.has(instance.id)) {
        instanceMap.set(instance.id, {
          id: instance.id,
          type_id: instance.type_id,
          name: instance.name,
          created_at: instance.created_at,
          property_values: []
        });
      }

      // Add property value if it exists (left join might return null)
      if (propertyValue && property) {
        const instanceData = instanceMap.get(instance.id)!;
        instanceData.property_values.push({
          id: propertyValue.id,
          instance_id: propertyValue.instance_id,
          property_id: propertyValue.property_id,
          value: propertyValue.value,
          created_at: propertyValue.created_at,
          property: {
            id: property.id,
            type_id: property.type_id,
            name: property.name,
            property_type: property.property_type,
            created_at: property.created_at
          }
        });
      }
    }

    return Array.from(instanceMap.values());
  } catch (error) {
    console.error('Getting instances failed:', error);
    throw error;
  }
}