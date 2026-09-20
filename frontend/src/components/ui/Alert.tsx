import * as React from 'react';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const variants: Record<AlertVariant, string> = {
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-green-50 text-green-700 border-green-200',
};

export function Alert({ variant = 'error', className = '', children, ...props }: AlertProps) {
  return (
    <div
      className={`p-4 rounded-md border text-sm ${variants[variant]} ${className}`}
      role={variant === 'error' ? 'alert' : 'status'}
      {...props}
    >
      {children}
    </div>
  );
}
