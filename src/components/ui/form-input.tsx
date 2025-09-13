import { cn } from '@/lib/utils';
import React, { useRef, useState } from 'react';
import {
  Controller,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';

interface FormInputProps<T extends FieldValues>
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'form' | 'prefix' | 'onFocus' | 'onBlur' | 'name'
  > {
  form: UseFormReturn<T>;
  name: keyof T;
  label?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  rules?: Record<string, unknown>;
  onFocus?: () => void;
  onBlur?: () => void;
}

const FormInput = <T extends FieldValues>({
  form,
  name,
  label,
  prefix,
  suffix,
  containerClassName,
  inputClassName,
  labelClassName,
  rules,
  onFocus,
  onBlur,
  disabled,
  type = 'text',
  placeholder,
  ...props
}: FormInputProps<T>) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fieldValue = form.watch(name as any);
  const fieldError = form.formState.errors[name];
  const hasValue = fieldValue && String(fieldValue).length > 0;
  const shouldAnimateUp = isFocused || hasValue;

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  return (
    <div className={cn('w-full mb-4', containerClassName)}>
      <div
        className={cn(
          'relative flex items-center border border-border rounded-lg bg-background transition-colors',
          'focus-within:border-primary focus-within:ring-primary box-border',
          fieldError &&
            'border-red-500 focus-within:border-red-500 focus-within:ring-red-500',
          disabled && 'bg-input cursor-not-allowed',
          'min-h-[52px]'
        )}
      >
        {prefix && (
          <div className='flex items-center pl-3 pr-2 text-foreground'>
            {prefix}
          </div>
        )}

        <div className='flex-1 relative'>
          {label && (
            <label
              className={cn(
                'absolute left-3 transition-all duration-200 pointer-events-none',
                'text-foreground',
                shouldAnimateUp
                  ? 'top-1 text-xs text-blue-500'
                  : 'top-1/2 -translate-y-1/2 text-sm',
                isFocused && shouldAnimateUp && 'text-blue-500',
                fieldError && 'text-red-500',
                prefix && 'left-0',
                labelClassName
              )}
              htmlFor={name as string}
            >
              {label}
            </label>
          )}

          <Controller
            control={form.control}
            name={name as any}
            rules={rules}
            render={({ field }) => (
              <input
                {...field}
                {...props}
                ref={inputRef}
                id={name as string}
                type={type}
                disabled={disabled}
                placeholder={shouldAnimateUp ? placeholder : ''}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={cn(
                  'w-full bg-transparent text-sm text-foreground outline-none',
                  'px-3 py-4',
                  label && shouldAnimateUp && 'pt-6 pb-2',
                  label && !shouldAnimateUp && 'py-4',
                  !label && 'py-3',
                  prefix && 'pl-0',
                  suffix && 'pr-0',
                  disabled && 'cursor-not-allowed',
                  inputClassName
                )}
                value={field.value || ''}
              />
            )}
          />
        </div>

        {suffix && (
          <div className='flex items-center pr-3 pl-2 text-gray-500'>
            {suffix}
          </div>
        )}
      </div>

      {fieldError && (
        <div className='flex items-center gap-1 mt-1 text-red-500'>
          <svg
            className='w-3 h-3 flex-shrink-0'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
          <span className='text-xs'>{fieldError.message as string}</span>
        </div>
      )}
    </div>
  );
};

export default FormInput;
