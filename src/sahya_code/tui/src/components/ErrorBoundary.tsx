/**
 * Error Boundary - Catches and displays errors
 */

import React, { Component, ReactNode } from 'react';
import { Box, Text } from 'ink';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TUIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to file or external service
    console.error('TUI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" padding={2}>
          <Text bold color="red">
            ❌ An error occurred in the TUI
          </Text>
          <Box marginTop={1}>
            <Text color="red">{this.state.error?.message}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Press Ctrl+C to exit
            </Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
