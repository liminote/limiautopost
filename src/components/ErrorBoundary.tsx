import React from 'react'

type ErrorBoundaryProps = {
  fallback?: React.ReactNode
  children: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 可擴充：上報到監控平台
    console.error('[ErrorBoundary] Caught error:', error, info)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="container-app py-8">
          <div className="card card-body" style={{ color: '#b91c1c' }}>
            <div className="text-sm">發生錯誤，請重整頁面或回報：</div>
            <pre className="mt-2 text-xs overflow-auto" style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error?.message || this.state.error)}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}


