"use client";

import React, { type ReactNode, Component } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

const MapErrorFallback = () => (
    <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Google Maps Error</AlertTitle>
        <AlertDescription>
            The map could not be loaded. This is often because billing has not been enabled for the associated Google Cloud project. Please enable billing to use map features.
        </AlertDescription>
    </Alert>
);

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if the error message is the specific billing error
    if (error.message.includes("BillingNotEnabledMapError")) {
        return { hasError: true };
    }
    // For other errors, rethrow them
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (error.message.includes("BillingNotEnabledMapError")) {
        console.error("Caught Google Maps Billing Error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <MapErrorFallback />;
    }
    return this.props.children;
  }
}


export function MapProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="rounded-lg border bg-card p-6 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-destructive">Missing Google Maps API Key</h2>
          <p className="mt-2 text-muted-foreground">
            Please set the <code className="font-mono text-sm">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
            {children}
        </APIProvider>
    </ErrorBoundary>
  );
}