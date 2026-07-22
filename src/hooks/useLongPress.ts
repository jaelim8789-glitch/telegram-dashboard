import { useCallback, useRef } from 'react';

interface LongPressEvent {
  onPress: () => void;
  onLongPress: () => void;
  delay?: number;
}

export const useLongPress = ({ onPress, onLongPress, delay = 500 }: LongPressEvent) => {
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startPress = useCallback(() => {
    pressTimer.current = setTimeout(() => {
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const endPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      onPress();
    }
  }, [onPress]);

  const cancelPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  return {
    onMouseDown: startPress,
    onMouseUp: endPress,
    onMouseLeave: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: endPress,
    onTouchCancel: cancelPress,
  };
};