"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="rounded-xl p-6 flex flex-col items-center gap-3 text-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid rgba(255,61,87,0.2)" }}
      >
        <AlertTriangle size={20} style={{ color: "var(--accent-red)" }} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {this.props.label ?? "Something went wrong"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {this.state.error.message}
          </p>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
          style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}
        >
          <RefreshCw size={11} /> Try again
        </button>
      </div>
    );
  }
}
