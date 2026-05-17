import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          position: 'absolute',
          height: 70,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={50}
            tint="dark"
            style={StyleSheet.absoluteFill}
          >
            <View style={[StyleSheet.absoluteFill, styles.tabBarOverlay]} />
          </BlurView>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="history" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color, focused }: { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <MaterialCommunityIcons name={name} size={24} color={color} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarOverlay: {
    backgroundColor: 'rgba(13, 2, 33, 0.75)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.15)',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  iconWrapActive: {
    // subtle active indicator handled by dot
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
    marginTop: 4,
  },
});
