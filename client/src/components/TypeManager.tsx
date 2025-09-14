import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  DataTypeWithProperties, 
  InstanceWithValues, 
  CreateDataTypeInput,
  CreatePropertyInput,
  CreateInstanceInput,
  PropertyType
} from '../../../server/src/schema';

interface TypeManagerProps {
  dataTypes: DataTypeWithProperties[];
  instances: InstanceWithValues[];
  onDataTypesChange: (types: DataTypeWithProperties[]) => void;
  onInstancesChange: (instances: InstanceWithValues[]) => void;
  getInstancesByType: (typeId: number) => InstanceWithValues[];
}

export function TypeManager({ 
  dataTypes, 
  instances, 
  onDataTypesChange, 
  onInstancesChange, 
  getInstancesByType 
}: TypeManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Data Type Form State
  const [dataTypeForm, setDataTypeForm] = useState<CreateDataTypeInput>({
    name: '',
    description: null
  });

  // Property Form State
  const [propertyForm, setPropertyForm] = useState<CreatePropertyInput>({
    type_id: 0,
    name: '',
    property_type: 'string' as PropertyType
  });

  // Instance Form State
  const [instanceForm, setInstanceForm] = useState<CreateInstanceInput>({
    type_id: 0,
    name: ''
  });

  // Property Value Form State
  const [selectedInstanceId, setSelectedInstanceId] = useState<number>(0);
  const [propertyValues, setPropertyValues] = useState<{ [key: number]: string }>({});

  const handleCreateDataType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataTypeForm.name.trim()) return;

    setIsLoading(true);
    try {
      const newType = await trpc.createDataType.mutate(dataTypeForm);
      onDataTypesChange([...dataTypes, { ...newType, properties: [] }]);
      setDataTypeForm({ name: '', description: null });
    } catch (error) {
      console.error('Failed to create data type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyForm.name.trim() || !propertyForm.type_id) return;

    setIsLoading(true);
    try {
      const newProperty = await trpc.createProperty.mutate(propertyForm);
      const updatedTypes = dataTypes.map((type: DataTypeWithProperties) =>
        type.id === propertyForm.type_id
          ? { ...type, properties: [...type.properties, newProperty] }
          : type
      );
      onDataTypesChange(updatedTypes);
      setPropertyForm({ type_id: 0, name: '', property_type: 'string' });
    } catch (error) {
      console.error('Failed to create property:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanceForm.name.trim() || !instanceForm.type_id) return;

    setIsLoading(true);
    try {
      const newInstance = await trpc.createInstance.mutate(instanceForm);
      const instanceWithValues = { ...newInstance, property_values: [] };
      onInstancesChange([...instances, instanceWithValues]);
      setInstanceForm({ type_id: 0, name: '' });
    } catch (error) {
      console.error('Failed to create instance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePropertyValues = async () => {
    if (!selectedInstanceId) return;

    const selectedInstance = instances.find((inst: InstanceWithValues) => inst.id === selectedInstanceId);
    if (!selectedInstance) return;

    const selectedType = dataTypes.find((type: DataTypeWithProperties) => type.id === selectedInstance.type_id);
    if (!selectedType) return;

    setIsLoading(true);
    try {
      const promises = selectedType.properties.map(async (property) => {
        const value = propertyValues[property.id] || '';
        if (!value.trim()) return null;

        return await trpc.createPropertyValue.mutate({
          instance_id: selectedInstanceId,
          property_id: property.id,
          value: value.trim()
        });
      });

      await Promise.all(promises.filter(Boolean));
      
      // Refresh instances to get updated property values
      const updatedInstances = await trpc.getInstances.query();
      onInstancesChange(updatedInstances);
      
      setPropertyValues({});
      setSelectedInstanceId(0);
    } catch (error) {
      console.error('Failed to save property values:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedInstance = instances.find((inst: InstanceWithValues) => inst.id === selectedInstanceId);
  const selectedType = selectedInstance 
    ? dataTypes.find((type: DataTypeWithProperties) => type.id === selectedInstance.type_id)
    : null;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="types" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="types">Data Types</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="instances">Instances</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
        </TabsList>

        {/* Create Data Types */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🏷️ Create Data Type</CardTitle>
              <CardDescription>
                Define a new custom data type (e.g., Country, Quantity, Person)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDataType} className="space-y-4">
                <div>
                  <Label htmlFor="typeName">Type Name</Label>
                  <Input
                    id="typeName"
                    placeholder="e.g., Country, Quantity, Person"
                    value={dataTypeForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDataTypeForm((prev: CreateDataTypeInput) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="typeDescription">Description (optional)</Label>
                  <Textarea
                    id="typeDescription"
                    placeholder="Brief description of this data type"
                    value={dataTypeForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setDataTypeForm((prev: CreateDataTypeInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                  />
                </div>
                <Button type="submit" disabled={isLoading || !dataTypeForm.name.trim()}>
                  {isLoading ? 'Creating...' : 'Create Type'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Data Types */}
          <div className="grid gap-4">
            {dataTypes.map((type: DataTypeWithProperties) => (
              <Card key={type.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {type.name}
                    <Badge variant="secondary">{type.properties.length} properties</Badge>
                  </CardTitle>
                  {type.description && (
                    <CardDescription>{type.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {type.properties.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Properties:</Label>
                      <div className="flex flex-wrap gap-2">
                        {type.properties.map((property) => (
                          <Badge key={property.id} variant="outline">
                            {property.name}: {property.property_type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Create Properties */}
        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Add Property</CardTitle>
              <CardDescription>
                Add properties to your data types (e.g., Capital: string, Population: number)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProperty} className="space-y-4">
                <div>
                  <Label htmlFor="propertyType">Data Type</Label>
                  <Select
                    value={propertyForm.type_id.toString()}
                    onValueChange={(value) =>
                      setPropertyForm((prev: CreatePropertyInput) => ({ ...prev, type_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a data type" />
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
                <div>
                  <Label htmlFor="propertyName">Property Name</Label>
                  <Input
                    id="propertyName"
                    placeholder="e.g., Capital, Population, Title"
                    value={propertyForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPropertyForm((prev: CreatePropertyInput) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="propertyDataType">Property Type</Label>
                  <Select
                    value={propertyForm.property_type}
                    onValueChange={(value: PropertyType) =>
                      setPropertyForm((prev: CreatePropertyInput) => ({ ...prev, property_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String (text)</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean (true/false)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isLoading || !propertyForm.name.trim() || !propertyForm.type_id}>
                  {isLoading ? 'Adding...' : 'Add Property'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Instances */}
        <TabsContent value="instances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📝 Create Instance</CardTitle>
              <CardDescription>
                Create specific instances of your data types (e.g., France, Apples)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInstance} className="space-y-4">
                <div>
                  <Label htmlFor="instanceType">Data Type</Label>
                  <Select
                    value={instanceForm.type_id.toString()}
                    onValueChange={(value) =>
                      setInstanceForm((prev: CreateInstanceInput) => ({ ...prev, type_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a data type" />
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
                <div>
                  <Label htmlFor="instanceName">Instance Name</Label>
                  <Input
                    id="instanceName"
                    placeholder="e.g., France, Apples, John Doe"
                    value={instanceForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setInstanceForm((prev: CreateInstanceInput) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading || !instanceForm.name.trim() || !instanceForm.type_id}>
                  {isLoading ? 'Creating...' : 'Create Instance'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Instances */}
          <div className="space-y-4">
            {dataTypes.map((type: DataTypeWithProperties) => {
              const typeInstances = getInstancesByType(type.id);
              if (typeInstances.length === 0) return null;

              return (
                <Card key={type.id}>
                  <CardHeader>
                    <CardTitle>{type.name} Instances</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {typeInstances.map((instance: InstanceWithValues) => (
                        <div key={instance.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-medium">{instance.name}</span>
                          <Badge variant="outline">
                            {instance.property_values.length} / {type.properties.length} values
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Add Property Values */}
        <TabsContent value="values" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>💡 Set Property Values</CardTitle>
              <CardDescription>
                Fill in the property values for your instances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="selectInstance">Select Instance</Label>
                <Select
                  value={selectedInstanceId.toString() || ''}
                  onValueChange={(value) => setSelectedInstanceId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an instance to edit" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances.map((instance: InstanceWithValues) => {
                      const type = dataTypes.find((t: DataTypeWithProperties) => t.id === instance.type_id);
                      return (
                        <SelectItem key={instance.id} value={instance.id.toString()}>
                          {instance.name} ({type?.name || 'Unknown'})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedInstance && selectedType && (
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-4">
                      Setting values for: {selectedInstance.name} ({selectedType.name})
                    </h4>
                    <div className="space-y-3">
                      {selectedType.properties.map((property) => {
                        const existingValue = selectedInstance.property_values.find(
                          (pv) => pv.property_id === property.id
                        );
                        
                        return (
                          <div key={property.id}>
                            <Label htmlFor={`prop-${property.id}`}>
                              {property.name} ({property.property_type})
                            </Label>
                            <Input
                              id={`prop-${property.id}`}
                              type={property.property_type === 'number' ? 'number' : 'text'}
                              placeholder={`Enter ${property.name.toLowerCase()}`}
                              value={propertyValues[property.id] || existingValue?.value || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setPropertyValues((prev) => ({
                                  ...prev,
                                  [property.id]: e.target.value
                                }))
                              }
                            />
                            {existingValue && (
                              <p className="text-sm text-gray-500 mt-1">
                                Current value: {existingValue.value}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Button onClick={handleSavePropertyValues} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Values'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}