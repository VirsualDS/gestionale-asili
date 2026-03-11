type ChildAlertsProps = {
  successMessage: string | null;
  errorMessage: string | null;
};

export function ChildAlerts({
  successMessage,
  errorMessage,
}: ChildAlertsProps) {
  return (
    <>
      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}
    </>
  );
}