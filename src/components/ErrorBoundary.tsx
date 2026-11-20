import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50/80 border border-rose-200 rounded-2xl text-rose-900 my-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm sm:text-base font-bold text-rose-950">
                {this.props.fallbackTitle || 'Terjadi Masalah pada Tampilan Komponen'}
              </h3>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                {this.props.fallbackMessage ||
                  'Komponen mengalami kendala saat memuat data. Anda dapat mencoba memuat ulang atau mereset tampilan ini.'}
              </p>

              {this.state.error && (
                <div className="mt-3 p-3 bg-white/80 rounded-xl border border-rose-200 font-mono text-[11px] text-rose-800 break-words max-h-36 overflow-y-auto">
                  {this.state.error.toString()}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Muat Ulang Komponen
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Refresh Halaman
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
