import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

/**
 * Error boundary to catch React rendering errors
 * Prevents entire app from crashing if a component fails
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        // Log to console for development debugging
        console.error('ErrorBoundary caught error:', error)
        console.error('Error info:', errorInfo)

        // Store error details for display
        this.setState({
            error,
            errorInfo,
        })

        // In production, you could send to error tracking service (Sentry, etc.)
        // Sentry.captureException(error, { contexts: { react: errorInfo } })
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        })
    }

    render() {
        if (this.state.hasError) {
            return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
        }

        return this.props.children
    }
}

/**
 * Fallback UI when error occurs
 */
function ErrorFallback({ error, onReset }) {
    return (
        <div className="min-h-screen bg-warm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-card border border-border p-6 text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
                        <AlertCircle size={24} className="text-danger" />
                    </div>
                </div>

                <h2 className="text-lg font-bold text-charcoal mb-2">Terjadi Kesalahan</h2>

                <p className="text-sm text-stone mb-4">
                    Maaf, aplikasi mengalami kesalahan yang tidak terduga.
                    Silakan coba refresh halaman atau hubungi administrator.
                </p>

                {process.env.NODE_ENV === 'development' && error && (
                    <div className="mt-4 p-3 bg-danger/5 border border-danger/20 rounded text-xs text-danger text-left overflow-auto max-h-40">
                        <p className="font-mono font-bold mb-1">Error Message:</p>
                        <p>{error.toString()}</p>
                    </div>
                )}

                <div className="flex gap-2 mt-6">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 px-3 py-2 rounded-input bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
                    >
                        Refresh Halaman
                    </button>
                    <button
                        onClick={onReset}
                        className="flex-1 px-3 py-2 rounded-input border border-border text-charcoal text-sm font-medium hover:bg-warm transition-colors flex items-center justify-center gap-1"
                    >
                        <RotateCcw size={14} /> Coba Lagi
                    </button>
                </div>
            </div>
        </div>
    )
}
