import { AlertTriangle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  message: string | null;
  tone?: "warning" | "info";
  position?: "top" | "bottom";
  duration?: number;
  onDismiss?: () => void;
}

// Non-blocking crowd/predictive alert toast (spec 3.5, 3.6) - auto-dismisses, never blocks map interaction.
export function AlertBanner({ message, tone = "warning", position = "top", duration = 8000, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message || !visible) return null;

  const Icon = tone === "warning" ? AlertTriangle : Info;

  return (
    <div className={`alert-banner ${tone} ${position}`} role="status">
      <Icon size={16} />
      <span>{message}</span>
      <button
        aria-label="Dismiss"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
