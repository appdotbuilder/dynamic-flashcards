import { z } from 'zod';

// Property type enum for defining data types
export const propertyTypeSchema = z.enum(['string', 'number', 'boolean']);
export type PropertyType = z.infer<typeof propertyTypeSchema>;

// Schema for defining a property within a custom type
export const propertySchema = z.object({
  id: z.number(),
  type_id: z.number(),
  name: z.string(),
  property_type: propertyTypeSchema,
  created_at: z.coerce.date()
});
export type Property = z.infer<typeof propertySchema>;

// Schema for custom data types (e.g., Country, Quantity)
export const dataTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});
export type DataType = z.infer<typeof dataTypeSchema>;

// Schema for instances of custom types (e.g., specific countries, quantities)
export const instanceSchema = z.object({
  id: z.number(),
  type_id: z.number(),
  name: z.string(),
  created_at: z.coerce.date()
});
export type Instance = z.infer<typeof instanceSchema>;

// Schema for property values of instances
export const propertyValueSchema = z.object({
  id: z.number(),
  instance_id: z.number(),
  property_id: z.number(),
  value: z.string(), // Store all values as strings, parse as needed
  created_at: z.coerce.date()
});
export type PropertyValue = z.infer<typeof propertyValueSchema>;

// Flashcard type enum
export const flashcardTypeSchema = z.enum(['true_false', 'multiple_choice', 'fill_in_blank']);
export type FlashcardType = z.infer<typeof flashcardTypeSchema>;

// Schema for generated flashcards
export const flashcardSchema = z.object({
  id: z.number(),
  instance_id: z.number(),
  property_id: z.number(),
  flashcard_type: flashcardTypeSchema,
  question: z.string(),
  correct_answer: z.string(),
  options: z.array(z.string()).nullable(), // For multiple choice questions
  created_at: z.coerce.date()
});
export type Flashcard = z.infer<typeof flashcardSchema>;

// Schema for user answers to flashcards
export const answerSchema = z.object({
  id: z.number(),
  flashcard_id: z.number(),
  user_answer: z.string(),
  is_correct: z.boolean(),
  answered_at: z.coerce.date()
});
export type Answer = z.infer<typeof answerSchema>;

// Input schemas for creating entities
export const createDataTypeInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional()
});
export type CreateDataTypeInput = z.infer<typeof createDataTypeInputSchema>;

export const createPropertyInputSchema = z.object({
  type_id: z.number(),
  name: z.string().min(1),
  property_type: propertyTypeSchema
});
export type CreatePropertyInput = z.infer<typeof createPropertyInputSchema>;

export const createInstanceInputSchema = z.object({
  type_id: z.number(),
  name: z.string().min(1)
});
export type CreateInstanceInput = z.infer<typeof createInstanceInputSchema>;

export const createPropertyValueInputSchema = z.object({
  instance_id: z.number(),
  property_id: z.number(),
  value: z.string()
});
export type CreatePropertyValueInput = z.infer<typeof createPropertyValueInputSchema>;

export const generateFlashcardsInputSchema = z.object({
  instance_id: z.number()
});
export type GenerateFlashcardsInput = z.infer<typeof generateFlashcardsInputSchema>;

export const submitAnswerInputSchema = z.object({
  flashcard_id: z.number(),
  user_answer: z.string()
});
export type SubmitAnswerInput = z.infer<typeof submitAnswerInputSchema>;

// Output schemas with relations
export const dataTypeWithPropertiesSchema = dataTypeSchema.extend({
  properties: z.array(propertySchema)
});
export type DataTypeWithProperties = z.infer<typeof dataTypeWithPropertiesSchema>;

export const instanceWithValuesSchema = instanceSchema.extend({
  property_values: z.array(propertyValueSchema.extend({
    property: propertySchema
  }))
});
export type InstanceWithValues = z.infer<typeof instanceWithValuesSchema>;