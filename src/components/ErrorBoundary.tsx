import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Sentry from '@sentry/react-native';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
    Sentry.captureException(error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0a0a0a',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🛹</Text>
        <Text
          style={{ fontSize: 20, fontWeight: '700', color: '#ffffff', marginBottom: 8 }}>
          Something went wrong
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: '#9a9a9a',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 20,
          }}>
          The app hit an unexpected error. Tap below to try again.
        </Text>
        <Pressable
          onPress={this.reset}
          style={{
            backgroundColor: '#34C759',
            paddingVertical: 12,
            paddingHorizontal: 28,
            borderRadius: 24,
          }}>
          <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}
