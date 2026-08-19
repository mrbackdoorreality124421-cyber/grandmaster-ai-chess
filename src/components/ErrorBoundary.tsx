import React, { Component, ReactNode, ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#02040a] text-slate-100 flex flex-col items-center justify-center p-4 select-none">
          <div className="bg-[#060913]/95 border border-[#d4af37]/40 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-[0_0_50px_rgba(212,175,55,0.25)]">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-[#d4af37]/40 flex items-center justify-center mx-auto text-[#d4af37]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#d4af37] to-yellow-500 uppercase tracking-wide font-serif">
                Recovery Triggered
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Corrupted game state detected and safely isolated. Click below to restore the Supreme Grandmaster board.
              </p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-[#d4af37] hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer font-serif"
            >
              <RefreshCw className="w-4 h-4" />
              Reset & Restore Board
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
