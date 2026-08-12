import { Image, StyleSheet, View } from 'react-native';

type QuiloreLogoProps = {
  size?: number;
};

export function QuiloreLogo({ size = 120 }: QuiloreLogoProps) {
  return (
    <View style={styles.wrap} accessibilityLabel="Quilore logo">
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
