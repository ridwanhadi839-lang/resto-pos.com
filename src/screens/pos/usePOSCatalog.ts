import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { CATEGORIES, PRODUCTS } from '../../data/mockData';
import { fetchCatalog } from '../../services/orderService';
import { Category, Product } from '../../types';

export const usePOSCatalog = () => {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [isCatalogLoading, setCatalogLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(CATEGORIES[0]?.id ?? '');

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const catalog = await fetchCatalog();
      const nextCategories = catalog.categories.length > 0 ? catalog.categories : CATEGORIES;
      const nextProducts = catalog.products.length > 0 ? catalog.products : PRODUCTS;

      setCategories(nextCategories);
      setProducts(nextProducts);
      setSelectedCategoryId((prev) => {
        const exists = nextCategories.some((cat) => cat.id === prev);
        return exists ? prev : nextCategories[0]?.id ?? '';
      });
    } catch {
      setCategories(CATEGORIES);
      setProducts(PRODUCTS);
      setSelectedCategoryId((prev) => (prev ? prev : CATEGORIES[0]?.id ?? ''));
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
    selectedCategoryId,
    setSelectedCategoryId,
    reloadCatalog: loadCatalog,
  };
};
