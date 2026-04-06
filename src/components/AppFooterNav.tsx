import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { useCartStore } from '../store/cartStore';

type FooterTab = 'Home' | 'Orders' | 'Tables';

interface AppFooterNavProps {
  currentTab: FooterTab;
  compact?: boolean;
  showPendingAction?: boolean;
  navigation: {
    navigate: (screen: string, params?: object) => void;
  };
}

const FOOTER_ITEMS: Array<{
  id: FooterTab;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { id: 'Home', label: 'Home', icon: 'home-outline' },
  { id: 'Orders', label: 'Orders', icon: 'clipboard-text-outline' },
  { id: 'Tables', label: 'Tables', icon: 'table-chair' },
];

export const AppFooterNav: React.FC<AppFooterNavProps> = ({
  currentTab,
  compact,
  showPendingAction = true,
  navigation,
}) => {
  const itemCount = useCartStore((s) => s.itemCount);
  const pendingCarts = useCartStore((s) => s.pendingCarts);
  const saveCurrentCartAsPending = useCartStore((s) => s.saveCurrentCartAsPending);

  const handlePendingPress = () => {
    const saved = saveCurrentCartAsPending();

    if (!saved) {
      Alert.alert('Cart kosong', 'Belum ada item untuk dipending.');
      navigation.navigate('Home');
      return;
    }

    Alert.alert('Order dipending', `${saved.orderNumber} dipindahkan ke daftar pending order.`);
    navigation.navigate('Orders', {
      focusTab: 'parked',
      focusKey: Date.now(),
    });
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.row}>
        {FOOTER_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          const badgeCount =
            item.id === 'Home' ? itemCount() : item.id === 'Orders' ? pendingCarts.length : 0;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.navButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(item.id)}
            >
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={20}
                  color={isActive ? COLORS.primaryPurple : COLORS.textGray}
                />
                {badgeCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}

        {showPendingAction ? (
          <TouchableOpacity style={styles.plusButton} activeOpacity={0.9} onPress={handlePendingPress}>
            <MaterialCommunityIcons name="plus" size={22} color={COLORS.white} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  containerCompact: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    minHeight: 24,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textGray,
  },
  labelActive: {
    color: COLORS.primaryPurple,
  },
  plusButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
});
