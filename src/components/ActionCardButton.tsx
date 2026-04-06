import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionCard } from '../types';
import { COLORS, RADIUS } from '../constants/theme';

interface ActionCardButtonProps {
  card: ActionCard;
  onPress: (card: ActionCard) => void;
}

export const ActionCardButton: React.FC<ActionCardButtonProps> = ({ card, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(card)}
      activeOpacity={0.75}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={card.icon as never} size={18} color={COLORS.white} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {card.label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 82,
    height: 76,
    backgroundColor: COLORS.primaryPurple,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
});
