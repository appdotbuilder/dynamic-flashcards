import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createDataTypeInputSchema,
  createPropertyInputSchema,
  createInstanceInputSchema,
  createPropertyValueInputSchema,
  generateFlashcardsInputSchema,
  submitAnswerInputSchema
} from './schema';

// Import handlers
import { createDataType } from './handlers/create_data_type';
import { getDataTypes } from './handlers/get_data_types';
import { createProperty } from './handlers/create_property';
import { createInstance } from './handlers/create_instance';
import { createPropertyValue } from './handlers/create_property_value';
import { getInstances } from './handlers/get_instances';
import { getInstancesByType } from './handlers/get_instances_by_type';
import { generateFlashcards } from './handlers/generate_flashcards';
import { getFlashcards } from './handlers/get_flashcards';
import { getFlashcardsByInstance } from './handlers/get_flashcards_by_instance';
import { submitAnswer } from './handlers/submit_answer';
import { getFlashcardById } from './handlers/get_flashcard_by_id';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Data type management
  createDataType: publicProcedure
    .input(createDataTypeInputSchema)
    .mutation(({ input }) => createDataType(input)),
  
  getDataTypes: publicProcedure
    .query(() => getDataTypes()),

  // Property management
  createProperty: publicProcedure
    .input(createPropertyInputSchema)
    .mutation(({ input }) => createProperty(input)),

  // Instance management
  createInstance: publicProcedure
    .input(createInstanceInputSchema)
    .mutation(({ input }) => createInstance(input)),
  
  getInstances: publicProcedure
    .query(() => getInstances()),
  
  getInstancesByType: publicProcedure
    .input(z.object({ typeId: z.number() }))
    .query(({ input }) => getInstancesByType(input.typeId)),

  // Property value management
  createPropertyValue: publicProcedure
    .input(createPropertyValueInputSchema)
    .mutation(({ input }) => createPropertyValue(input)),

  // Flashcard management
  generateFlashcards: publicProcedure
    .input(generateFlashcardsInputSchema)
    .mutation(({ input }) => generateFlashcards(input)),
  
  getFlashcards: publicProcedure
    .query(() => getFlashcards()),
  
  getFlashcardsByInstance: publicProcedure
    .input(z.object({ instanceId: z.number() }))
    .query(({ input }) => getFlashcardsByInstance(input.instanceId)),
  
  getFlashcardById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getFlashcardById(input.id)),

  // Answer management
  submitAnswer: publicProcedure
    .input(submitAnswerInputSchema)
    .mutation(({ input }) => submitAnswer(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();