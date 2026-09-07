"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import { reportError } from "@/lib/telemetry";

interface Props {
  children: ReactNode;
  appName?: "web-buyer" | "web-seller" | "web-admin" | "web-relay";
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class TelemetryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Une erreur inattendue est survenue" };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError({
      app: this.props.appName || "web-buyer",
      level: "fatal",
      message: error.message || "React Render Crash",
      error_stack: `${error.stack || ""}\nComponent Stack:${errorInfo.componentStack || ""}`,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-gray-800">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Une anomalie est survenue</h2>
            <p className="text-sm text-gray-600 mb-6">
              Notre équipe technique a été automatiquement informée de ce bug. Vous pouvez rafraîchir la page pour reprendre votre navigation.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition shadow-md"
              >
                Rafraîchir la page
              </button>
              <Link
                href="/"
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-center"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function TelemetryInitializer({ appName = "web-buyer" }: { appName?: Props["appName"] }) {
  React.useEffect(() => {
    import("@/lib/telemetry").then((mod) => {
      mod.initGlobalTelemetry(appName);
    });
  }, [appName]);

  return null;
}
