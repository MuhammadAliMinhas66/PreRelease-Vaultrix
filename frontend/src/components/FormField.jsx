import { useId } from 'react';

function FormField({ label, type = 'text', value, onChange, error, id, ...rest }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-base text-ink sm:text-sm outline-none transition focus:ring-2 focus:ring-accent/20 ${
          error ? 'border-red-400 focus:border-red-500' : 'border-border focus:border-accent'
        }`}
        {...rest}
      />
      {error && (
        <span id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

export default FormField;
