import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import Animated, {useSharedValue,useAnimatedStyle,withTiming,interpolateColor,} from 'react-native-reanimated';

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);
  const animatedProgress = useSharedValue(0);
  
  const handleNext = () => {
    const newProgress = progress >= 100 ? 0 : progress + 25;
    setProgress(newProgress);
    animatedProgress.value = withTiming(newProgress, { duration: 500 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const width = `${animatedProgress.value}%`;
    const backgroundColor = interpolateColor(
      animatedProgress.value,
      [0, 25, 50, 75, 100],
      ['#aaa', '#3498db', '#f1c40f', '#e67e22', '#27ae60']
    );
    return {
      width,
      backgroundColor,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.barBackground}>
        <Animated.View style={[styles.barFill, animatedStyle]} />
      </View>
      <Button title="Next" onPress={handleNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    alignItems: 'center',
  },
  barBackground: {
    width: '100%',
    height: 20,
    backgroundColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
  },
});