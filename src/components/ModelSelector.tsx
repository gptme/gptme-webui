import { Loader2 } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProviderIcon } from '@/components/ProviderIcon';
import { useModels } from '@/hooks/useModels';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface ModelSelectorProps<T extends FieldValues> {
  control?: Control<T>;
  name?: FieldPath<T>;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  showFormField?: boolean;
}

export function ModelSelector<T extends FieldValues = FieldValues>({
  control,
  name,
  value,
  onValueChange,
  disabled = false,
  placeholder,
  label = 'Model',
  showFormField = true,
}: ModelSelectorProps<T>) {
  const { models, availableModels, isLoading } = useModels();

  const renderModelItem = (modelFull: string) => {
    const modelInfo = models.find((m) => m.id === modelFull);
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          {modelInfo?.provider && <ProviderIcon provider={modelInfo.provider} />}
          <span className="font-medium">{modelInfo?.model || modelFull}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {modelInfo?.context && <span>{Math.round(modelInfo.context / 1000)}k ctx</span>}
          {modelInfo?.supports_vision && <span className="text-blue-600">👁️ vision</span>}
          {modelInfo?.supports_reasoning && <span className="text-green-600">🧠 reasoning</span>}
        </div>
      </div>
    );
  };

  const selectContent = (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <div className="flex w-full items-center justify-between">
          <SelectValue placeholder={placeholder || 'Select model'} />
          {isLoading && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />}
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((modelFull) => (
          <SelectItem key={modelFull} value={modelFull}>
            {renderModelItem(modelFull)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!showFormField || !control || !name) {
    return selectContent;
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? ''}
              disabled={disabled || isLoading}
            >
              <SelectTrigger>
                <div className="flex w-full items-center justify-between">
                  <SelectValue placeholder={placeholder || 'Select model'} />
                  {isLoading && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />}
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((modelFull) => (
                  <SelectItem key={modelFull} value={modelFull}>
                    {renderModelItem(modelFull)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormDescription>The model to use.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
