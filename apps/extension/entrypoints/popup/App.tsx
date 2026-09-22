// PROJECT_SPEC.md §5.1 — Save job / Apply tabs land in M8/M9.
function App() {
  return (
    <div className="flex min-h-40 flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-accent text-xs font-semibold text-white dark:text-stone-950">
          A
        </div>
        <span className="text-sm font-medium">ApplyDesk</span>
        <span
          className="ml-auto size-2 rounded-full bg-border"
          title="Not connected"
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-text-muted">Save job and Apply are coming soon.</p>
    </div>
  );
}

export default App;
