import { Button } from '@/components/ui/button';
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { type UseFieldArrayReturn, type UseFormReturn } from 'react-hook-form';
import type { FormSchema } from '@/schemas/conversationSettings';
import { ToolFormat } from '@/types/api';

interface ToolsConfigurationProps {
  form: UseFormReturn<FormSchema>;
  toolFields: UseFieldArrayReturn<FormSchema, 'chat.tools'>;
  isSubmitting: boolean;
}

export const ToolsConfiguration = ({ form, toolFields, isSubmitting }: ToolsConfigurationProps) => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const { fields, append, remove } = toolFields;

  const handleAddTool = () => {
    const trimmedName = newToolName.trim();
    if (trimmedName) {
      append({ name: trimmedName });
      setNewToolName('');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Tools</h3>

      <FormField
        control={form.control}
        name="chat.tool_format"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tool Format</FormLabel>
            <Select
              onValueChange={(value) => field.onChange(value)}
              value={field.value ?? ''}
              disabled={isSubmitting}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select tool format" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(ToolFormat).map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
        <FormItem>
          <CollapsibleTrigger>
            <div className="flex w-full items-center justify-start">
              <FormLabel>Enabled Tools</FormLabel>
              {toolsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
            <FormDescription className="mt-3">
              List of tools that the agent can use.
            </FormDescription>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-0">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <span className="flex-grow">{field.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                    aria-label="Remove tool"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="my-2 flex items-center space-x-2">
              <Input
                placeholder="New tool name"
                value={newToolName}
                onChange={(e) => setNewToolName(e.target.value)}
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTool();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTool}
                disabled={!newToolName.trim() || isSubmitting}
              >
                Add Tool
              </Button>
            </div>
          </CollapsibleContent>
        </FormItem>
      </Collapsible>
    </div>
  );
};
