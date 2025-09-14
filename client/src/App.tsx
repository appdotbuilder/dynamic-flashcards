import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { TypeManager } from '@/components/TypeManager';
import { FlashcardGenerator } from '@/components/FlashcardGenerator';
import { FlashcardPlayer } from '@/components/FlashcardPlayer';
import type { DataTypeWithProperties, InstanceWithValues, Flashcard } from '../../server/src/schema';

function App() {
  const [dataTypes, setDataTypes] = useState<DataTypeWithProperties[]>([]);
  const [instances, setInstances] = useState<InstanceWithValues[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeTab, setActiveTab] = useState('types');
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [typesResult, instancesResult, flashcardsResult] = await Promise.all([
        trpc.getDataTypes.query(),
        trpc.getInstances.query(),
        trpc.getFlashcards.query()
      ]);
      setDataTypes(typesResult);
      setInstances(instancesResult);
      setFlashcards(flashcardsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshFlashcards = useCallback(async () => {
    try {
      const result = await trpc.getFlashcards.query();
      setFlashcards(result);
    } catch (error) {
      console.error('Failed to refresh flashcards:', error);
    }
  }, []);

  const getInstancesByType = (typeId: number): InstanceWithValues[] => {
    return instances.filter((instance: InstanceWithValues) => instance.type_id === typeId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧠 Smart Flashcards
          </h1>
          <p className="text-lg text-gray-600">
            Create custom data types and generate dynamic flashcards automatically
          </p>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="text-center mb-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        )}

        {/* Main content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="types" className="flex items-center gap-2">
              📋 Setup
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              ⚡ Generate
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center gap-2">
              🎯 Practice
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab - Create types, properties, and instances */}
          <TabsContent value="types" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📋 Data Type Setup</CardTitle>
                <CardDescription>
                  Create custom data types, define their properties, and add instances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TypeManager
                  dataTypes={dataTypes}
                  instances={instances}
                  onDataTypesChange={setDataTypes}
                  onInstancesChange={setInstances}
                  getInstancesByType={getInstancesByType}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generate Tab - Create flashcards from instances */}
          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>⚡ Flashcard Generation</CardTitle>
                <CardDescription>
                  Generate flashcards from your data instances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FlashcardGenerator
                  dataTypes={dataTypes}
                  instances={instances}
                  onFlashcardsGenerated={refreshFlashcards}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Practice Tab - Answer flashcards */}
          <TabsContent value="practice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>🎯 Practice Flashcards</span>
                  <Badge variant="secondary">
                    {flashcards.length} flashcards available
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Answer flashcards to test your knowledge
                </CardDescription>
              </CardHeader>
              <CardContent>
                {flashcards.length > 0 ? (
                  <FlashcardPlayer flashcards={flashcards} />
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No flashcards available yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Create some data types and instances first, then generate flashcards
                    </p>
                    <div className="space-x-2">
                      <Button onClick={() => setActiveTab('types')}>
                        📋 Setup Data Types
                      </Button>
                      <Button variant="outline" onClick={() => setActiveTab('generate')}>
                        ⚡ Generate Flashcards
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{dataTypes.length}</div>
              <div className="text-sm text-gray-600">Data Types</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{instances.length}</div>
              <div className="text-sm text-gray-600">Instances</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{flashcards.length}</div>
              <div className="text-sm text-gray-600">Flashcards</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;