// AccessibleTouchable.tsx — Accessible touchable component with proper labels
import { TouchableOpacity, TouchableOpacityProps, Text, View } from 'react-native';
import { ReactNode } from 'react';

interface AccessibleTouchableProps extends TouchableOpacityProps {
  label: string;
  hint?: string;
  children: ReactNode;
  variant?: 'button' | 'link' | 'icon';
}

/**
 * Accessible touchable component with proper accessibility labels
 */
export function AccessibleTouchable({
  label,
  hint,
  children,
  variant = 'button',
  ...props
}: AccessibleTouchableProps) {
  return (
    <TouchableOpacity
      accessibilityRole={variant === 'link' ? 'link' : variant === 'button' ? 'button' : 'button'}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{
        disabled: props.disabled,
      }}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

interface AccessibleIconProps {
  name: string;
  label: string;
  size?: number;
  color?: string;
}

/**
 * Accessible icon with screen reader label
 */
export function AccessibleIcon({ name, label, size = 24, color }: AccessibleIconProps) {
  return (
    <View accessibilityLabel={label} accessibilityRole="image">
      <Text style={{ fontSize: size, color }}>{name}</Text>
    </View>
  );
}

interface AccessibleCardProps {
  label: string;
  hint?: string;
  children: ReactNode;
  onPress?: () => void;
}

/**
 * Accessible card component
 */
export function AccessibleCard({ label, hint, children, onPress }: AccessibleCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(195,199,204,0.3)',
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
