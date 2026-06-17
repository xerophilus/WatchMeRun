import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * A solid dot with an expanding, fading ring behind it — the "live" pulse used
 * on the Live screen for the running/resting status and the map position.
 * Recreated natively from the design's `livedot` CSS keyframe.
 */
export function LiveDot({ color, size = 13 }: { color: string; size?: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 2.4 }],
    opacity: 0.55 * (1 - progress.value),
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, backgroundColor: color },
          ring,
        ]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
