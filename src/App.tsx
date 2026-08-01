import { AppShell } from "./app/shell/AppShell";
import { useAppBootstrap } from "./hooks/use-app-bootstrap";

export default function App() {
  const { ready, appName } = useAppBootstrap();

  if (!ready) {
    return (
      <div className="app-shell app-shell--loading" role="status" aria-live="polite">
        <div className="app-atmosphere" aria-hidden="true">
          <div className="app-atmosphere__wash" />
        </div>
        <p className="sr-only">Loading {appName}</p>
      </div>
    );
  }

  return <AppShell appName={appName} />;
}
