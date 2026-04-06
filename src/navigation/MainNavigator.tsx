import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { POSScreen } from '../screens/POSScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { COLORS } from '../constants/theme';
import { useCartStore } from '../store/cartStore';

export type MainTabParamList = {
  Home: undefined;
  Orders: { focusTab?: 'parked' | 'pending' | 'paid' | 'sent_to_kitchen'; focusKey?: number } | undefined;
  Tables: undefined;
  Menu: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Home: 'home-outline',
  Orders: 'clipboard-text-outline',
  Tables: 'table-chair',
  Menu: 'plus',
};

interface TabIconProps {
  name: keyof MainTabParamList;
  focused: boolean;
  badgeCount?: number;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, badgeCount }) => (
  <View style={tabStyles.iconContainer}>
    <MaterialCommunityIcons
      name={TAB_ICONS[name]}
      size={22}
      color={focused ? COLORS.primaryPurple : COLORS.textGray}
    />
    {badgeCount != null && badgeCount > 0 ? (
      <View style={tabStyles.badge}>
        <Text style={tabStyles.badgeText}>{badgeCount}</Text>
      </View>
    ) : null}
  </View>
);

export const MainNavigator: React.FC = () => {
  const itemCount = useCartStore((s) => s.itemCount);
  const pendingCarts = useCartStore((s) => s.pendingCarts);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
        tabBarActiveTintColor: COLORS.primaryPurple,
        tabBarInactiveTintColor: COLORS.textGray,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon
            name={route.name as keyof MainTabParamList}
            focused={focused}
            badgeCount={
              route.name === 'Home'
                ? itemCount()
                : route.name === 'Orders'
                  ? pendingCarts.length
                  : undefined
            }
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={POSScreen} />
      <Tab.Screen name="Orders" component={POSScreen} />
      <Tab.Screen name="Tables" component={POSScreen} />
      <Tab.Screen name="Menu" component={MoreScreen} />
    </Tab.Navigator>
  );
};

const tabStyles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: COLORS.primaryPurple,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
});
