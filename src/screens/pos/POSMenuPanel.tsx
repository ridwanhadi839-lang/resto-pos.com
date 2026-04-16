import React from 'react';
import { FlatList, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { ActionCardButton } from '../../components/ActionCardButton';
import { AppFooterNav } from '../../components/AppFooterNav';
import { CategoryCard } from '../../components/CategoryCard';
import { ProductCard } from '../../components/ProductCard';
import { COLORS, RADIUS } from '../../constants/theme';
import { ACTION_CARDS } from '../../data/mockData';
import { ActionCard, Category, Product } from '../../types';
import { OrdersScreen } from '../OrdersScreen';
import { TablesScreen } from '../TablesScreen';

interface POSMenuPanelProps {
  style?: StyleProp<ViewStyle>;
  isOrdersView: boolean;
  isTablesView: boolean;
  navigation: {
    navigate: (screen: string, params?: object) => void;
  };
  categories: Category[];
  selectedCategoryId: string;
  isCatalogLoading: boolean;
  catalogError: string | null;
  filteredProducts: Product[];
  onSelectCategory: (categoryId: string) => void;
  onProductPress: (product: Product) => void;
  onActionCardPress: (card: ActionCard) => void;
}

export const POSMenuPanel: React.FC<POSMenuPanelProps> = ({
  style,
  isOrdersView,
  isTablesView,
  navigation,
  categories,
  selectedCategoryId,
  isCatalogLoading,
  catalogError,
  filteredProducts,
  onSelectCategory,
  onProductPress,
  onActionCardPress,
}) => {
  return (
    <View style={[styles.menuPanel, style, (isOrdersView || isTablesView) && styles.ordersPanel]}>
      {isOrdersView ? (
        <>
          <View style={styles.ordersContentWrap}>
            <OrdersScreen />
          </View>
          <AppFooterNav currentTab="Orders" navigation={navigation} />
        </>
      ) : isTablesView ? (
        <>
          <View style={styles.ordersContentWrap}>
            <TablesScreen embedded />
          </View>
          <AppFooterNav currentTab="Tables" navigation={navigation} />
        </>
      ) : (
        <>
          <View style={styles.menuContentWrap}>
            <View style={styles.actionRow}>
              {ACTION_CARDS.map((card) => (
                <ActionCardButton key={card.id} card={card} onPress={onActionCardPress} />
              ))}
            </View>

            <View style={styles.categorySection}>
              <Text style={styles.sectionHeading}>Menu Categories</Text>
              {catalogError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorTitle}>Katalog belum tersambung</Text>
                  <Text style={styles.errorText}>{catalogError}</Text>
                </View>
              ) : null}
              <View style={styles.categoryRow}>
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    isActive={selectedCategoryId === category.id}
                    onPress={(selectedCategory) => onSelectCategory(selectedCategory.id)}
                  />
                ))}
              </View>
            </View>

            {isCatalogLoading ? (
              <View style={styles.loadingWrap}>
                <Text style={styles.loadingText}>Memuat menu...</Text>
              </View>
            ) : (
              <FlatList
                style={styles.productsList}
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                numColumns={5}
                columnWrapperStyle={styles.productRow}
                contentContainerStyle={styles.productGrid}
                renderItem={({ item }) => (
                  <View style={styles.productCardWrap}>
                    <ProductCard product={item} onPress={onProductPress} />
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.loadingWrap}>
                    <Text style={styles.loadingText}>Belum ada menu di kategori ini.</Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          <AppFooterNav currentTab="Home" navigation={navigation} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  menuPanel: {
    minHeight: 0,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 10,
    gap: 10,
  },
  ordersPanel: {
    flex: 1,
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  menuContentWrap: {
    flex: 1,
    minHeight: 0,
    gap: 10,
  },
  ordersContentWrap: {
    flex: 1,
    minHeight: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categorySection: {
    gap: 6,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  productsList: {
    flex: 1,
  },
  productGrid: {
    paddingBottom: 10,
    gap: 8,
  },
  productRow: {
    gap: 8,
  },
  productCardWrap: {
    flex: 1,
    maxWidth: '19%',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.textGray,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.sm,
    padding: 10,
    gap: 4,
  },
  errorTitle: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    lineHeight: 18,
  },
});
