import { db } from '../db';
import { instancesTable, propertyValuesTable, propertiesTable } from '../db/schema';
import { type InstanceWithValues } from '../schema';
import { eq } from 'drizzle-orm';

export async function getInstancesByType(typeId: number): Promise<InstanceWithValues[]> {
  try {
    // First, get all instances for the given type
    const instances = await db.select()
      .from(instancesTable)
      .where(eq(instancesTable.type_id, typeId))
      .execute();

    if (instances.length === 0) {
      return [];
    }

    // Get all property values for these instances with their properties
    const instanceIds = instances.map(instance => instance.id);
    
    const propertyValuesWithProperties = await db.select()
      .from(propertyValuesTable)
      .innerJoin(propertiesTable, eq(propertyValuesTable.property_id, propertiesTable.id))
      .where(eq(propertyValuesTable.instance_id, instanceIds[0]))
      .execute();

    // For multiple instances, we need to get all property values
    let allPropertyValues: any[] = [];
    
    for (const instanceId of instanceIds) {
      const values = await db.select()
        .from(propertyValuesTable)
        .innerJoin(propertiesTable, eq(propertyValuesTable.property_id, propertiesTable.id))
        .where(eq(propertyValuesTable.instance_id, instanceId))
        .execute();
      
      allPropertyValues = allPropertyValues.concat(values);
    }

    // Group property values by instance
    const propertyValuesByInstance = allPropertyValues.reduce((acc, result) => {
      const instanceId = result.property_values.instance_id;
      if (!acc[instanceId]) {
        acc[instanceId] = [];
      }
      
      acc[instanceId].push({
        id: result.property_values.id,
        instance_id: result.property_values.instance_id,
        property_id: result.property_values.property_id,
        value: result.property_values.value,
        created_at: result.property_values.created_at,
        property: {
          id: result.properties.id,
          type_id: result.properties.type_id,
          name: result.properties.name,
          property_type: result.properties.property_type,
          created_at: result.properties.created_at
        }
      });
      
      return acc;
    }, {} as Record<number, any[]>);

    // Combine instances with their property values
    return instances.map(instance => ({
      id: instance.id,
      type_id: instance.type_id,
      name: instance.name,
      created_at: instance.created_at,
      property_values: propertyValuesByInstance[instance.id] || []
    }));
  } catch (error) {
    console.error('Failed to get instances by type:', error);
    throw error;
  }
}