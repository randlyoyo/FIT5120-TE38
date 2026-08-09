export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <div className="spinner" />
      {label && <span>{label}</span>}
    </div>
  );
}
