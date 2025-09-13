import { cn } from '@/lib/utils';
import React from 'react';
import { Controller, type FieldValues, type UseFormReturn } from 'react-hook-form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './select';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface FormSelectProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: keyof T;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onSelect?: (value: string) => void;
  disabled?: boolean;
  multiple?: boolean;
  size?: 'sm' | 'default';
  searchable?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  rules?: Record<string, unknown>;
}

const FormSelect = <T extends FieldValues>({
  form,
  name,
  label,
  options,
  placeholder,
  prefix,
  suffix,
  onSelect,
  disabled,
  size = 'default',
  className,
  triggerClassName,
  contentClassName,
  rules,
  ...props
}: FormSelectProps<T>) => {
  const fieldError = form.formState.errors[name];

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <Controller
        control={form.control}
        name={name as string}
        rules={rules}
        render={({ field }) => (
          <div className="relative">
            {prefix && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                {prefix}
              </div>
            )}
            
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onSelect?.(value);
              }}
              disabled={disabled}
              {...props}
            >
              <SelectTrigger
                className={cn(
                  'w-full',
                  prefix && 'pl-10',
                  suffix && 'pr-10',
                  fieldError && 'border-red-500 focus:ring-red-500',
                  triggerClassName
                )}
                size={size}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              
              <SelectContent className={contentClassName}>
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={String(option.value)}
                    disabled={option.disabled}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon && option.icon}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {suffix && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                {suffix}
              </div>
            )}
          </div>
        )}
      />
      
      {fieldError && (
        <div className="flex items-center gap-1 text-red-500">
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs">
            {fieldError.message as string}
          </span>
        </div>
      )}
    </div>
  );
};

export default FormSelect;
