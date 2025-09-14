import { db } from '../db';
import { 
  instancesTable, 
  propertyValuesTable, 
  propertiesTable, 
  flashcardsTable 
} from '../db/schema';
import { type GenerateFlashcardsInput, type Flashcard } from '../schema';
import { eq } from 'drizzle-orm';

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<Flashcard[]> {
  try {
    // 1. Fetch the instance with its property values
    const instanceResult = await db.select()
      .from(instancesTable)
      .where(eq(instancesTable.id, input.instance_id))
      .execute();

    if (instanceResult.length === 0) {
      throw new Error(`Instance with id ${input.instance_id} not found`);
    }

    const instance = instanceResult[0];

    // Fetch property values with their property definitions
    const propertyValuesResult = await db.select()
      .from(propertyValuesTable)
      .innerJoin(propertiesTable, eq(propertyValuesTable.property_id, propertiesTable.id))
      .where(eq(propertyValuesTable.instance_id, input.instance_id))
      .execute();

    if (propertyValuesResult.length === 0) {
      throw new Error(`No property values found for instance ${input.instance_id}`);
    }

    // 2. Generate flashcards for each property
    const flashcardsToInsert = [];

    for (const result of propertyValuesResult) {
      const propertyValue = result.property_values;
      const property = result.properties;

      // True/False flashcard
      const trueFalseFlashcard = {
        instance_id: input.instance_id,
        property_id: property.id,
        flashcard_type: 'true_false' as const,
        question: `Is the ${property.name} of '${instance.name}' equal to '${propertyValue.value}'?`,
        correct_answer: 'true',
        options: null
      };

      // Multiple Choice flashcard - generate 3 fake options plus the correct answer
      const correctAnswer = propertyValue.value;
      const fakeOptions = generateFakeOptions(correctAnswer, property.property_type);
      const allOptions = [correctAnswer, ...fakeOptions];
      // Shuffle the options
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

      const multipleChoiceFlashcard = {
        instance_id: input.instance_id,
        property_id: property.id,
        flashcard_type: 'multiple_choice' as const,
        question: `What is the ${property.name} of '${instance.name}'?`,
        correct_answer: correctAnswer,
        options: shuffledOptions
      };

      // Fill-in-blank flashcard
      const fillInBlankFlashcard = {
        instance_id: input.instance_id,
        property_id: property.id,
        flashcard_type: 'fill_in_blank' as const,
        question: `What is the ${property.name} of '${instance.name}'?`,
        correct_answer: correctAnswer,
        options: null
      };

      flashcardsToInsert.push(trueFalseFlashcard, multipleChoiceFlashcard, fillInBlankFlashcard);
    }

    // 3. Store generated flashcards in the database
    const insertedFlashcards = await db.insert(flashcardsTable)
      .values(flashcardsToInsert)
      .returning()
      .execute();

    // 4. Return the generated flashcards
    return insertedFlashcards.map(flashcard => ({
      ...flashcard,
      options: flashcard.options as string[] | null
    }));

  } catch (error) {
    console.error('Flashcard generation failed:', error);
    throw error;
  }
}

// Helper function to generate fake options for multiple choice questions
function generateFakeOptions(correctAnswer: string, propertyType: 'string' | 'number' | 'boolean'): string[] {
  const fakeOptions: string[] = [];
  
  switch (propertyType) {
    case 'number':
      const num = parseFloat(correctAnswer);
      if (!isNaN(num)) {
        fakeOptions.push((num + 1).toString());
        fakeOptions.push((num - 1).toString());
        fakeOptions.push((num * 2).toString());
      } else {
        fakeOptions.push('42', '0', '100');
      }
      break;
      
    case 'boolean':
      fakeOptions.push(correctAnswer === 'true' ? 'false' : 'true');
      fakeOptions.push('maybe', 'unknown');
      break;
      
    case 'string':
    default:
      // Generate some generic fake string options
      const commonFakes = [
        'Unknown',
        'Not Available',
        'Placeholder',
        'Default Value',
        'Sample Text',
        'Test Data'
      ];
      
      // Pick 3 different fake options that don't match the correct answer
      const availableFakes = commonFakes.filter(fake => fake !== correctAnswer);
      for (let i = 0; i < 3 && i < availableFakes.length; i++) {
        fakeOptions.push(availableFakes[i]);
      }
      
      // If we don't have enough, add some generic ones
      while (fakeOptions.length < 3) {
        const genericOption = `Option ${fakeOptions.length + 1}`;
        if (genericOption !== correctAnswer) {
          fakeOptions.push(genericOption);
        }
      }
      break;
  }
  
  return fakeOptions.slice(0, 3); // Ensure we only return 3 options
}