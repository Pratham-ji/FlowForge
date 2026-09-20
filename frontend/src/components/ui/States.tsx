import * as React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center p-12 bg-white border-2 border-dashed border-gray-300 rounded-lg">
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
      <h3 className="text-sm font-medium text-red-800">{title}</h3>
      <div className="mt-2 text-sm text-red-700">
        <p>{message}</p>
      </div>
      {onRetry && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-red-800 hover:text-red-900 underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
