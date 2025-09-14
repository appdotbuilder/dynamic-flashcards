import { serial, text, pgTable, timestamp, integer, boolean, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for property types
export const propertyTypeEnum = pgEnum('property_type', ['string', 'number', 'boolean']);

// Enum for flashcard types
export const flashcardTypeEnum = pgEnum('flashcard_type', ['true_false', 'multiple_choice', 'fill_in_blank']);

// Data types table (e.g., Country, Quantity)
export const dataTypesTable = pgTable('data_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Properties table (defines properties for each data type)
export const propertiesTable = pgTable('properties', {
  id: serial('id').primaryKey(),
  type_id: integer('type_id').notNull(),
  name: text('name').notNull(),
  property_type: propertyTypeEnum('property_type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Instances table (specific instances of data types)
export const instancesTable = pgTable('instances', {
  id: serial('id').primaryKey(),
  type_id: integer('type_id').notNull(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Property values table (values for each property of each instance)
export const propertyValuesTable = pgTable('property_values', {
  id: serial('id').primaryKey(),
  instance_id: integer('instance_id').notNull(),
  property_id: integer('property_id').notNull(),
  value: text('value').notNull(), // Store all values as text, parse as needed
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Flashcards table (generated flashcards)
export const flashcardsTable = pgTable('flashcards', {
  id: serial('id').primaryKey(),
  instance_id: integer('instance_id').notNull(),
  property_id: integer('property_id').notNull(),
  flashcard_type: flashcardTypeEnum('flashcard_type').notNull(),
  question: text('question').notNull(),
  correct_answer: text('correct_answer').notNull(),
  options: jsonb('options'), // For multiple choice questions - nullable
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Answers table (user answers to flashcards)
export const answersTable = pgTable('answers', {
  id: serial('id').primaryKey(),
  flashcard_id: integer('flashcard_id').notNull(),
  user_answer: text('user_answer').notNull(),
  is_correct: boolean('is_correct').notNull(),
  answered_at: timestamp('answered_at').defaultNow().notNull()
});

// Relations
export const dataTypesRelations = relations(dataTypesTable, ({ many }) => ({
  properties: many(propertiesTable),
  instances: many(instancesTable)
}));

export const propertiesRelations = relations(propertiesTable, ({ one, many }) => ({
  dataType: one(dataTypesTable, {
    fields: [propertiesTable.type_id],
    references: [dataTypesTable.id]
  }),
  propertyValues: many(propertyValuesTable),
  flashcards: many(flashcardsTable)
}));

export const instancesRelations = relations(instancesTable, ({ one, many }) => ({
  dataType: one(dataTypesTable, {
    fields: [instancesTable.type_id],
    references: [dataTypesTable.id]
  }),
  propertyValues: many(propertyValuesTable),
  flashcards: many(flashcardsTable)
}));

export const propertyValuesRelations = relations(propertyValuesTable, ({ one }) => ({
  instance: one(instancesTable, {
    fields: [propertyValuesTable.instance_id],
    references: [instancesTable.id]
  }),
  property: one(propertiesTable, {
    fields: [propertyValuesTable.property_id],
    references: [propertiesTable.id]
  })
}));

export const flashcardsRelations = relations(flashcardsTable, ({ one, many }) => ({
  instance: one(instancesTable, {
    fields: [flashcardsTable.instance_id],
    references: [instancesTable.id]
  }),
  property: one(propertiesTable, {
    fields: [flashcardsTable.property_id],
    references: [propertiesTable.id]
  }),
  answers: many(answersTable)
}));

export const answersRelations = relations(answersTable, ({ one }) => ({
  flashcard: one(flashcardsTable, {
    fields: [answersTable.flashcard_id],
    references: [flashcardsTable.id]
  })
}));

// Export all tables for queries
export const tables = {
  dataTypes: dataTypesTable,
  properties: propertiesTable,
  instances: instancesTable,
  propertyValues: propertyValuesTable,
  flashcards: flashcardsTable,
  answers: answersTable
};