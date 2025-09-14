import { type CreatePropertyValueInput, type PropertyValue } from '../schema';

export async function createPropertyValue(input: CreatePropertyValueInput): Promise<PropertyValue> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is setting a property value for an instance
    // (e.g., setting "Capital: Paris" for the "France" instance) and persisting it in the database.
    return Promise.resolve({
        id: 0, // Placeholder ID
        instance_id: input.instance_id,
        property_id: input.property_id,
        value: input.value,
        created_at: new Date()
    } as PropertyValue);
}