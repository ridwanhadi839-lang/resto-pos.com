import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { CATEGORIES, PRODUCTS } from '../../data/mockData';
import { fetchCatalog, hasRemoteCatalogAccess } from '../../services/orderService';
import { Category, Product } from '../../types';

export const usePOSCatalog = () => {
  const [categories, setCategories] = useState<Category[]>(hasRemoteCatalogAccess ? [] : CATEGORIES);
  const [products, setProducts] = useState<Product[]>(hasRemoteCatalogAccess ? [] : PRODUCTS);
  const [isCatalogLoading, setCatalogLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    hasRemoteCatalogAccess ? '' : CATEGORIES[0]?.id ?? ''
  );
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const catalog = await fetchCatalog();
      const nextCategories = catalog.categories;
      const nextProducts = catalog.products;

      setCategories(nextCategories);
      setProducts(nextProducts);
      setSelectedCategoryId((prev) => {
        const exists = nextCategories.some((cat) => cat.id === prev);
        return exists ? prev : nextCategories[0]?.id ?? '';
      });
    } catch (error) {
      if (hasRemoteCatalogAccess) {
        setCategories([]);
        setProducts([]);
        setSelectedCategoryId('');
        setCatalogError(error instanceof Error ? error.message : 'Gagal memuat katalog.');
      } else {
        setCategories(CATEGORIES);
        setProducts(PRODUCTS);
        setSelectedCategoryId((prev) => (prev ? prev : CATEGORIES[0]?.id ?? ''));
      }
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useFocusEffect(
    useCallback(() => {
      loadCatalog();
    }, [loadCatalog])
  );

  const filteredProducts = useMemo(
    () => products.filter((product) => product.categoryId === selectedCategoryId),
    [products, selectedCategoryId]
  );

  return {
    categories,
    products,
    filteredProducts,
    isCatalogLoading,
    catalogError,
    selectedCategoryId,
    setSelectedCategoryId,
    reloadCatalog: loadCatalog,
  };
};
