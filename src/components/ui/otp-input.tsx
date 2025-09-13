import { cn } from '@/lib/utils';
import React, { type KeyboardEvent, useEffect, useRef, useState } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  tabIndex?: number;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  className,
  onComplete,
  autoFocus = false,
  tabIndex,
}) => {
  const [values, setValues] = useState<string[]>(new Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const lastCompletedValue = useRef<string>('');

  useEffect(() => {
    if (value) {
      const newValues = value.split('').slice(0, length);
      while (newValues.length < length) {
        newValues.push('');
      }
      setValues(newValues);
    } else {
      // Reset when value is cleared
      setValues(new Array(length).fill(''));
      lastCompletedValue.current = '';
    }
  }, [value, length]);

  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      refs.current[0].focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const otpValue = values.join('');
    if (otpValue !== value) {
      onChange(otpValue);
    }

    // Only call onComplete if the value is complete and different from last completed value
    if (otpValue.length === length && onComplete && otpValue !== lastCompletedValue.current) {
      lastCompletedValue.current = otpValue;
      onComplete(otpValue);
    }
  }, [values, onChange, length, onComplete, value]);

  const handleChange = (index: number, inputValue: string) => {
    if (disabled) return;

    const digit = inputValue.replace(/\D/g, '').slice(-1);

    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValues = [...values];

      if (values[index]) {
        newValues[index] = '';
        setValues(newValues);
      } else if (index > 0) {
        newValues[index - 1] = '';
        setValues(newValues);
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;

    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '');

    if (pasteData) {
      const newValues = pasteData.split('').slice(0, length);
      while (newValues.length < length) {
        newValues.push('');
      }
      setValues(newValues);

      const nextEmptyIndex = newValues.findIndex((val) => !val);
      const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : length - 1;
      refs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className={cn('flex gap-2 justify-center', className)}>
      {values.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type='text'
          inputMode='numeric'
          pattern='\d*'
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          tabIndex={tabIndex}
          className={cn(
            'w-12 h-12 text-center text-lg font-semibold',
            'border border-gray-300 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'transition-colors duration-200',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            digit && 'border-blue-500',
            className
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
