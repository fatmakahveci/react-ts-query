import { useEffect } from "react";
import { setPreference, usePreference } from "../../lib/visitor-preferences";

export default function ThemePicker() {
  const stored = usePreference("theme", "system");
  const theme = ["light", "dark"].includes(stored) ? stored : "system";
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media?.matches ? "dark" : "light") : theme;
    };
    apply();
    media?.addEventListener("change", apply);
    return () => media?.removeEventListener("change", apply);
  }, [theme]);
  return (
    <label className="theme-picker">
      <span aria-hidden="true">◐</span>
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(e) => setPreference("theme", e.target.value)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
