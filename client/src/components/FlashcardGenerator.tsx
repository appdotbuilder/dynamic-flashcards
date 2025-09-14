import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { DataTypeWithProperties, InstanceWithValues } from '../../../server/src/schema';

interface FlashcardGeneratorProps {
  dataTypes: DataTypeWithProperties[];
  instances: InstanceWithValues[];
  onFlashcardsGenerated: () => void;
}

export function FlashcardGenerator({ dataTypes, instances, onFlashcardsGenerated }: FlashcardGeneratorProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<number>(0);
  const [selectedInstanceId, setSelectedInstanceId] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);

  const selectedType = dataTypes.find((type: DataTypeWithProperties) => type.id === selectedTypeId);
  const availableInstances = instances.filter((instance: InstanceWithValues) => 
    instance.type_id === selectedTypeId && instance.property_values.length > 0
  );

  const handleGenerateForInstance = async (instanceId: number) => {
    setIsGenerating(true);
    setGeneratedCount(null);
    
    try {
      await trpc.generateFlashcards.mutate({ instance_id: instanceId });
      
      // Get the updated flashcard count for this instance
      const flashcards = await trpc.getFlashcardsByInstance.query({ instanceId });
      setGeneratedCount(flashcards.length);
      
      // Refresh the parent component's flashcards
      onFlashcardsGenerated();
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateForType = async () => {
    if (!selectedTypeId) return;

    setIsGenerating(true);
    setGeneratedCount(null);

    try {
      let totalGenerated = 0;
      
      for (const instance of availableInstances) {
        await trpc.generateFlashcards.mutate({ instance_id: instance.id });
        const flashcards = await trpc.getFlashcardsByInstance.query({ instanceId: instance.id });
        totalGenerated += flashcards.length;
      }
      
      setGeneratedCount(totalGenerated);
      onFlashcardsGenerated();
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateForSpecificInstance = async () => {
    if (!selectedInstanceId) return;
    await handleGenerateForInstance(selectedInstanceId);
  };



  const getInstancePropertyCount = (instance: InstanceWithValues): number => {
    return instance.property_values.length;
  };

  return (
    <div className="space-y-6">
      {/* Quick Generation Section */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">🚀 Quick Generate</CardTitle>
          <CardDescription className="text-green-700">
            Generate flashcards for all instances that have complete property data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataTypes.filter((type: DataTypeWithProperties) => {
            const typeInstances = instances.filter((instance: InstanceWithValues) => 
              instance.type_id === type.id && instance.property_values.length > 0
            );
            return typeInstances.length > 0;
          }).map((type: DataTypeWithProperties) => {
            const typeInstances = instances.filter((instance: InstanceWithValues) => 
              instance.type_id === type.id && instance.property_values.length > 0
            );
            
            return (
              <div key={type.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div>
                  <h4 className="font-medium">{type.name}</h4>
                  <p className="text-sm text-gray-600">
                    {typeInstances.length} instances ready for flashcard generation
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedTypeId(type.id);
                    handleGenerateForType();
                  }}
                  disabled={isGenerating}
                  size="sm"
                >
                  Generate All
                </Button>
              </div>
            );
          })}

          {dataTypes.every((type: DataTypeWithProperties) => {
            const typeInstances = instances.filter((instance: InstanceWithValues) => 
              instance.type_id === type.id && instance.property_values.length > 0
            );
            return typeInstances.length === 0;
          }) && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <h3 className="font-medium text-gray-900 mb-1">No instances ready</h3>
              <p className="text-gray-600 text-sm">
                Create some instances and add property values first
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Selective Generation</CardTitle>
          <CardDescription>
            Choose specific data types and instances for flashcard generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type Selection */}
          <div>
            <Label htmlFor="typeSelect">Select Data Type</Label>
            <Select
              value={selectedTypeId.toString()}
              onValueChange={(value) => {
                setSelectedTypeId(parseInt(value));
                setSelectedInstanceId(0);
                setGeneratedCount(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a data type" />
              </SelectTrigger>
              <SelectContent>
                {dataTypes.map((type: DataTypeWithProperties) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Instance Selection */}
          {selectedType && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="instanceSelect">Select Specific Instance (optional)</Label>
                <Select
                  value={selectedInstanceId.toString()}
                  onValueChange={(value) => setSelectedInstanceId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an instance or generate for all" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInstances.map((instance: InstanceWithValues) => (
                      <SelectItem key={instance.id} value={instance.id.toString()}>
                        {instance.name} ({getInstancePropertyCount(instance)} properties)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Available Instances Display */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Available Instances ({availableInstances.length})
                </Label>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {availableInstances.length > 0 ? (
                    availableInstances.map((instance: InstanceWithValues) => (
                      <div
                        key={instance.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <div>
                          <span className="font-medium">{instance.name}</span>
                          <div className="flex gap-1 mt-1">
                            {instance.property_values.map((pv) => (
                              <Badge key={pv.id} variant="secondary" className="text-xs">
                                {pv.property.name}: {pv.value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateForInstance(instance.id)}
                          disabled={isGenerating}
                        >
                          Generate
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-2xl mb-2">📋</div>
                      <p>No instances with property values found</p>
                      <p className="text-sm">Add some property values to your instances first</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Generation Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleGenerateForSpecificInstance}
                  disabled={isGenerating || !selectedInstanceId}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      ⚡ Generate for Selected
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTypeId(selectedTypeId);
                    handleGenerateForType();
                  }}
                  disabled={isGenerating || availableInstances.length === 0}
                  className="flex items-center gap-2"
                >
                  🎯 Generate for All {selectedType.name} Instances
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Message */}
      {generatedCount !== null && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Successfully generated {generatedCount} flashcards!
              </span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              You can now practice with your new flashcards in the Practice tab.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">💡 How Flashcard Generation Works</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 space-y-2">
          <p>• <strong>True/False:</strong> "Is the capital of France equal to Paris?"</p>
          <p>• <strong>Multiple Choice:</strong> "What is the capital of France?" with 4 options</p>
          <p>• <strong>Fill-in-the-blank:</strong> "What is the capital of France?" (type answer)</p>
          <p className="text-sm mt-3 text-blue-600">
            Flashcards are automatically generated based on your instance property values.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}