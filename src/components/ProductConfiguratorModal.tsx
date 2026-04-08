import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Product } from '../types';
import { COLORS, RADIUS } from '../constants/theme';
import { formatPrice } from '../data/mockData';

interface ProductConfiguratorModalProps {
  product: Product | null;
  visible: boolean;
  activeCategoryName?: string;
  initialQuantity?: number;
  initialOptions?: string[];
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (payload: { product: Product; quantity: number; options: string[] }) => void;
}

type VariantGroup = {
  id: string;
  options: string[];
};

const DEFAULT_VARIANT_GROUPS: VariantGroup[] = [
  {
    id: 'doneness',
    options: ['Medium Well', 'Well Done'],
  },
  {
    id: 'cheese',
    options: ['No Cheese', 'Extra Cheese'],
  },
];

const APPETIZER_VARIANT_GROUPS: VariantGroup[] = [
  {
    id: 'spice',
    options: ['Spicy', 'No Spicy'],
  },
  {
    id: 'jalapeno',
    options: ['Extra Jalapeno', 'Without Jalapeno'],
  },
];

const normalizeValue = (value: string | undefined | null) => value?.trim().toLowerCase() ?? '';

const getVariantGroups = (
  product: Product | null,
  activeCategoryName?: string
): VariantGroup[] => {
  if (!product) return [];

  const categoryName = normalizeValue(product.categoryName) || normalizeValue(activeCategoryName);
  if (categoryName === 'appetizer' || categoryName === 'appitizer') {
    return APPETIZER_VARIANT_GROUPS;
  }

  return DEFAULT_VARIANT_GROUPS;
};

const getInitialSelections = (variantGroups: VariantGroup[], options: string[]) => {
  const remaining = [...options];
  const selections: Record<string, string> = {};

  variantGroups.forEach((group) => {
    const matched = group.options.find((option) => remaining.includes(option));
    selections[group.id] = matched ?? '';

    if (matched) {
      const index = remaining.indexOf(matched);
      if (index >= 0) {
        remaining.splice(index, 1);
      }
    }
  });

  return {
    selections,
    customVariant: remaining.join(', '),
  };
};

export const ProductConfiguratorModal: React.FC<ProductConfiguratorModalProps> = ({
  product,
  visible,
  activeCategoryName,
  initialQuantity = 1,
  initialOptions = [],
  submitLabel = 'Tambah ke Cart',
  onClose,
  onSubmit,
}) => {
  const variantGroups = React.useMemo(
    () => getVariantGroups(product, activeCategoryName),
    [activeCategoryName, product]
  );
  const [quantity, setQuantity] = React.useState(initialQuantity);
  const [singleSelections, setSingleSelections] = React.useState<Record<string, string>>({});
  const [customVariant, setCustomVariant] = React.useState('');

  React.useEffect(() => {
    if (!visible) return;

    setQuantity(initialQuantity);
    const { selections, customVariant: initialCustomVariant } = getInitialSelections(
      variantGroups,
      initialOptions
    );
    setCustomVariant(initialCustomVariant);
    setSingleSelections(selections);
  }, [visible, initialOptions, initialQuantity, product?.id, variantGroups]);

  if (!product) return null;

  const presetOptions = variantGroups.flatMap((group) => group.options);

  const selectedPresetOptions = variantGroups
    .map((group) => singleSelections[group.id])
    .filter(Boolean);

  const compiledOptions = [
    ...selectedPresetOptions,
    ...(customVariant.trim() ? [customVariant.trim()] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <View style={styles.header}>
                <View style={styles.headerInfo}>
                  <Text style={styles.title}>{product.name}</Text>
                  <Text style={styles.subTitle}>{formatPrice(product.price)}</Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeText}>x</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                {presetOptions.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Variant</Text>
                    <View style={styles.optionRow}>
                      {presetOptions.map((option) => {
                        const ownerGroup = variantGroups.find((group) => group.options.includes(option));
                        if (!ownerGroup) return null;

                        const isSelected = singleSelections[ownerGroup.id] === option;

                        return (
                          <TouchableOpacity
                            key={option}
                            style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                            onPress={() => {
                              setSingleSelections((current) => ({ ...current, [ownerGroup.id]: option }));
                            }}
                          >
                            <Text
                              style={[styles.optionBtnText, isSelected && styles.optionBtnTextActive]}
                            >
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {selectedPresetOptions.length > 0 ? (
                      <View style={styles.selectedWrap}>
                        {selectedPresetOptions.map((option) => (
                          <View key={option} style={styles.selectedChip}>
                            <Text style={styles.selectedChipText}>{option}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Variant Input</Text>
                  <TextInput
                    style={styles.noteInput}
                    value={customVariant}
                    onChangeText={setCustomVariant}
                    placeholder="Contoh: no onion, extra sauce"
                    placeholderTextColor={COLORS.textLight}
                    multiline
                  />
                </View>

                <View style={styles.qtyPanel}>
                  <Text style={styles.sectionTitle}>Quantity</Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setQuantity((prev) => prev + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() =>
                    onSubmit({
                      product,
                      quantity,
                      options: compiledOptions,
                    })
                  }
                >
                  <Text style={styles.submitBtnText}>{submitLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '88%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: COLORS.textDark,
    fontSize: 20,
    fontWeight: '800',
  },
  subTitle: {
    color: COLORS.primaryPurple,
    fontSize: 14,
    fontWeight: '700',
  },
  closeText: {
    color: COLORS.textGray,
    fontSize: 22,
    fontWeight: '700',
  },
  contentScroll: {
    maxHeight: 420,
  },
  section: {
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '800',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  optionBtn: {
    width: '48%',
    minHeight: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionBtnActive: {
    backgroundColor: COLORS.primaryPurple,
    borderColor: COLORS.primaryPurple,
  },
  optionBtnText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '700',
  },
  optionBtnTextActive: {
    color: COLORS.white,
  },
  selectedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    backgroundColor: '#F5F3FF',
    borderColor: '#E9DDFE',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedChipText: {
    color: COLORS.primaryPurple,
    fontSize: 11,
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    color: COLORS.textDark,
  },
  footer: {
    paddingTop: 4,
  },
  qtyPanel: {
    alignItems: 'flex-end',
    gap: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: COLORS.textDark,
    fontSize: 22,
    fontWeight: '700',
  },
  qtyValue: {
    minWidth: 30,
    textAlign: 'center',
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: '800',
  },
  submitBtn: {
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
