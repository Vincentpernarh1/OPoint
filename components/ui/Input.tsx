import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../Icons';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'floating';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = 'default',
      className = '',
      id,
      type,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasValue = props.value !== '' && props.value !== undefined;
    
    // Determine if this is a password field
    const isPasswordField = type === 'password';
    const inputType = isPasswordField && showPassword ? 'text' : type;
    
    const baseInputStyles = 'w-full border rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50';
    
    const inputStateStyles = error
      ? 'border-error focus:border-error focus:ring-error/20'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20';
    
    const inputPaddingStyles = (() => {
      if (variant === 'floating') {
        const hasLeftIcon = leftIcon;
        const hasRightIcon = rightIcon || isPasswordField;
        return hasLeftIcon && hasRightIcon
          ? 'pl-12 pr-12 pt-6 pb-2'
          : hasLeftIcon
          ? 'pl-12 pr-4 pt-6 pb-2'
          : hasRightIcon
          ? 'pl-4 pr-12 pt-6 pb-2'
          : 'px-4 pt-6 pb-2';
      }
      const hasLeftIcon = leftIcon;
      const hasRightIcon = rightIcon || isPasswordField;
      return hasLeftIcon && hasRightIcon
        ? 'pl-12 pr-12 py-2.5'
        : hasLeftIcon
        ? 'pl-12 pr-4 py-2.5'
        : hasRightIcon
        ? 'pl-4 pr-12 py-2.5'
        : 'px-4 py-2.5';
    })();
    
    const combinedInputClassName = `${baseInputStyles} ${inputStateStyles} ${inputPaddingStyles} ${className}`;
    
    // Password toggle button
    const PasswordToggle = () => (
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOffIcon className="h-5 w-5" />
        ) : (
          <EyeIcon className="h-5 w-5" />
        )}
      </button>
    );
    
    if (variant === 'floating') {
      // Extract placeholder from props to prevent it from showing
      const { placeholder, ...inputProps } = props;
      
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={`${combinedInputClassName} peer`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...inputProps}
          />
          
          {label && (
            <label
              htmlFor={inputId}
              className={`
                absolute transition-all duration-200 pointer-events-none z-10
                ${leftIcon ? 'left-12' : 'left-4'}
                ${isFocused || hasValue
                  ? 'top-2 text-xs text-gray-500'
                  : 'top-1/2 -translate-y-1/2 text-base text-gray-400'
                }
                peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary-600
              `}
            >
              {label}
            </label>
          )}
          
          {/* Show placeholder only when focused and label is raised */}
          {placeholder && (isFocused || hasValue) && (
            <div className={`absolute bottom-2 text-sm text-gray-400 pointer-events-none ${leftIcon ? 'left-12' : 'left-4'}`}>
              {!hasValue && placeholder}
            </div>
          )}
          
          {isPasswordField && <PasswordToggle />}
          {!isPasswordField && rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
          
          {error && (
            <p className="mt-1.5 text-sm text-error flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          
          {helperText && !error && (
            <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      );
    }
    
    // Default variant
    return (
      <div className="relative">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            type={inputType}
            className={combinedInputClassName}
            {...props}
          />
          
          {isPasswordField && <PasswordToggle />}
          {!isPasswordField && rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1.5 text-sm text-error flex items-center gap-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
