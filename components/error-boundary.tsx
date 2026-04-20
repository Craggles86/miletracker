import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Without this, any render error on first launch
 * produces the "crash on launch" symptom instead of a visible message.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Intentionally low-noise: log for dev, but never crash on logging.
    try {
      console.warn('[ErrorBoundary]', error, info.componentStack);
    } catch {
      // ignore
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message = this.state.error?.message || 'An unexpected error occurred';

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          padding: 24,
          justifyContent: 'center',
        }}
      >
        <ScrollView contentContainerStyle={{ gap: 16, paddingVertical: 40 }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 22,
              color: Colors.textPrimary,
              textAlign: 'center',
            }}
          >
            Something went wrong
          </Text>
          <Text
            selectable
            style={{
              fontFamily: Fonts.regular,
              fontSize: 14,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {message}
          </Text>
          <Pressable
            onPress={this.reset}
            style={({ pressed }) => ({
              backgroundColor: Colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
              marginTop: 12,
            })}
          >
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 16,
                color: '#fff',
              }}
            >
              Try again
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
