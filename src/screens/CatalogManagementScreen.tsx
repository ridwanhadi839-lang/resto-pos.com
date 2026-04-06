import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { Category, Product } from '../types';
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  fetchCatalog,
  updateCategory,
  updateProduct,
} from '../services/orderService';
import { formatPrice } from '../data/mockData';

export const CatalogManagementScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryName, setCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCatalog();
      setCategories(data.categories);
      setProducts(data.products);
      setProductCategoryId((prev) => (prev ? prev : data.categories[0]?.id ?? ''));
    } catch (error) {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Gagal memuat katalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categories]);

  const resetCategoryForm = () => {
    setCategoryName('');
    setEditingCategoryId(null);
  };

  const resetProductForm = () => {
    setProductName('');
    setProductPrice('');
    setProductImageUrl('');
    setEditingProductId(null);
  };

  const onSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Validasi', 'Nama kategori wajib diisi.');
      return;
    }

    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, categoryName);
      } else {
        await createCategory(categoryName);
      }
      resetCategoryForm();
      await load();
    } catch (error) {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Gagal menyimpan kategori.');
    }
  };

  const onDeleteCategory = async (id: string) => {
    Alert.alert(
      'Hapus kategori',
      'Kategori akan dihapus jika tidak dipakai produk.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(id);
              await load();
            } catch (error) {
              Alert.alert(
                'Gagal',
                error instanceof Error ? error.message : 'Gagal menghapus kategori.'
              );
            }
          },
        },
      ]
    );
  };

  const onSaveProduct = async () => {
    const parsedPrice = Number(productPrice.replace(/[^\d.]/g, ''));
    if (!productName.trim()) {
      Alert.alert('Validasi', 'Nama produk wajib diisi.');
      return;
    }
    if (!productCategoryId) {
      Alert.alert('Validasi', 'Pilih kategori produk.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Validasi', 'Harga produk harus lebih dari 0.');
      return;
    }

    try {
      const payload = {
        name: productName,
        price: parsedPrice,
        categoryId: productCategoryId,
        imageUrl: productImageUrl || null,
      };

      if (editingProductId) {
        await updateProduct(editingProductId, payload);
      } else {
        await createProduct(payload);
      }

      resetProductForm();
      await load();
    } catch (error) {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Gagal menyimpan produk.');
    }
  };

  const onDeleteProduct = async (id: string) => {
    Alert.alert('Hapus produk', 'Produk akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(id);
            await load();
          } catch (error) {
            Alert.alert('Gagal', error instanceof Error ? error.message : 'Gagal menghapus produk.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primaryPurple} barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catalog CRUD</Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={load}>
          <Text style={styles.reloadBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kategori</Text>
          <TextInput
            style={styles.input}
            placeholder="Nama kategori"
            value={categoryName}
            onChangeText={setCategoryName}
          />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onSaveCategory}>
              <Text style={styles.primaryBtnText}>{editingCategoryId ? 'Update' : 'Tambah'}</Text>
            </TouchableOpacity>
            {editingCategoryId ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={resetCategoryForm}>
                <Text style={styles.secondaryBtnText}>Batal</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? <Text style={styles.loadingText}>Memuat kategori...</Text> : null}
          {categories.map((category) => (
            <View key={category.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{category.name}</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.inlineBtn}
                  onPress={() => {
                    setEditingCategoryId(category.id);
                    setCategoryName(category.name);
                  }}
                >
                  <Text style={styles.inlineBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlineBtn, styles.deleteBtn]}
                  onPress={() => onDeleteCategory(category.id)}
                >
                  <Text style={[styles.inlineBtnText, styles.deleteBtnText]}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Produk</Text>
          <TextInput
            style={styles.input}
            placeholder="Nama produk"
            value={productName}
            onChangeText={setProductName}
          />
          <TextInput
            style={styles.input}
            placeholder="Harga"
            value={productPrice}
            onChangeText={setProductPrice}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Image URL (opsional)"
            value={productImageUrl}
            onChangeText={setProductImageUrl}
            autoCapitalize="none"
          />
          <View style={styles.categoryPickerWrap}>
            <Text style={styles.label}>Kategori Produk</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipsWrap}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      productCategoryId === cat.id ? styles.chipActive : undefined,
                    ]}
                    onPress={() => setProductCategoryId(cat.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        productCategoryId === cat.id ? styles.chipTextActive : undefined,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onSaveProduct}>
              <Text style={styles.primaryBtnText}>{editingProductId ? 'Update' : 'Tambah'}</Text>
            </TouchableOpacity>
            {editingProductId ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={resetProductForm}>
                <Text style={styles.secondaryBtnText}>Batal</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? <Text style={styles.loadingText}>Memuat produk...</Text> : null}
          {products.map((product) => (
            <View key={product.id} style={styles.listRow}>
              <View style={styles.productInfo}>
                <Text style={styles.listTitle}>{product.name}</Text>
                <Text style={styles.listSub}>
                  {categoryNameById.get(product.categoryId) ?? 'Tanpa kategori'} -{' '}
                  {formatPrice(product.price)}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.inlineBtn}
                  onPress={() => {
                    setEditingProductId(product.id);
                    setProductName(product.name);
                    setProductPrice(String(product.price));
                    setProductImageUrl(product.imageUrl ?? '');
                    setProductCategoryId(product.categoryId);
                  }}
                >
                  <Text style={styles.inlineBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlineBtn, styles.deleteBtn]}
                  onPress={() => onDeleteProduct(product.id)}
                >
                  <Text style={[styles.inlineBtnText, styles.deleteBtnText]}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primaryPurple,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  reloadBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reloadBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  input: {
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    color: COLORS.textDark,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primaryPurple,
    height: 38,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: COLORS.border,
    height: 38,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    color: COLORS.textDark,
    fontWeight: '700',
  },
  loadingText: {
    color: COLORS.textGray,
    fontSize: 12,
  },
  listRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  listTitle: {
    color: COLORS.textDark,
    fontWeight: '700',
    fontSize: 13,
  },
  listSub: {
    color: COLORS.textGray,
    fontSize: 12,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 6,
  },
  inlineBtn: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  inlineBtnText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  deleteBtn: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {
    color: COLORS.error,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  categoryPickerWrap: {
    gap: 6,
  },
  label: {
    color: COLORS.textGray,
    fontSize: 12,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  chipActive: {
    backgroundColor: COLORS.primaryPurple,
    borderColor: COLORS.primaryPurple,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  chipTextActive: {
    color: COLORS.white,
  },
});
