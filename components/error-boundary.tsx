import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { t } from '@/i18n/useTranslation';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Top-level error boundary. Without this, any render error on first launch
 * produces the "crash on launch" symptom instead of a visible message.
 *
 * On Android this is CRITICAL — without an error boundary, a thrown error
 * during the first render causes the native Activity to crash before any
 * UI is shown, appearing as "app won't open" to the user.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    // Log comprehensively so crash logs from a real device are useful
    try {
      console.error(
        '[ErrorBoundary] CAUGHT:',
        error?.name,
        error?.message,
        '\nStack:',
        error?.stack?.slice(0, 1000),
        '\nComponent:',
        info.componentStack?.slice(0, 500)
      );
    } catch {
      // ignore
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const error = this.state.error;
    const message = error?.message || t('errorBoundary.defaultMessage');
    const stack = error?.stack || '';
    const componentStack = this.state.errorInfo?.componentStack || '';

    // On dev/debug builds show the full error for diagnosis
    const showDetails = __DEV__ || Platform.OS === 'android';

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
            {t('errorBoundary.title')}
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

          {showDetails && (
            <View
              style={{
                backgroundColor: '#1a1a2e',
                borderRadius: 8,
                padding: 12,
                marginTop: 8,
              }}
            >
              <Text
                selectable
                style={{
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 11,
                  color: '#f87171',
                  lineHeight: 16,
                }}
              >
                {error?.name}: {message}
              </Text>
              {stack ? (
                <Text
                  selectable
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    fontSize: 10,
                    color: '#94a3b8',
                    lineHeight: 14,
                    marginTop: 8,
                  }}
                >
                  {stack.slice(0, 800)}
                </Text>
              ) : null}
              {componentStack ? (
                <Text
                  selectable
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    fontSize: 10,
                    color: '#64748b',
                    lineHeight: 14,
                    marginTop: 8,
                  }}
                >
                  Component Stack:{'\n'}
                  {componentStack.slice(0, 500)}
                </Text>
              ) : null}
            </View>
          )}

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
              {t('common.tryAgain')}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
