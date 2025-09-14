import { type CreateInstanceInput, type Instance } from '../schema';

export async function createInstance(input: CreateInstanceInput): Promise<Instance> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new instance of a custom data type
    // (e.g., creating "France" as an instance of "Country" type) and persisting it in the database.
    return Promise.resolve({
        id: 0, // Placeholder ID
        type_id: input.type_id,
        name: input.name,
        created_at: new Date()
    } as Instance);
}