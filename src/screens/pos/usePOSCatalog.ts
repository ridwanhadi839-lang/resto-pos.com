import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { CATEGORIES, PRODUCTS } from '../../data/mockData';
import { fetchCatalog, getCachedCatalog, hasRemoteCatalogAccess } from '../../services/orderService';
import { Category, Product } from '../../types';

const attachCategoryNames = (categories: Category[], products: Product[]) => {
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  return products.map((product) => ({
    ...product,
    categoryName: categoryNameById.get(product.categoryId),
  }));
};

export const usePOSCatalog = () => {
  const [categories, setCategories] = useState<Category[]>(hasRemoteCatalogAccess ? [] : CATEGORIES);
  const [products, setProducts] = useState<Product[]>(
    hasRemoteCatalogAccess ? [] : attachCategoryNames(CATEGORIES, PRODUCTS)
  );
  const [isCatalogLoading, setCatalogLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    hasRemoteCatalogAccess ? '' : CATEGORIES[0]?.id ?? ''
  );
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const applyCatalog = useCallback((catalog: { categories: Category[]; products: Product[] }) => {
    const nextCategories = catalog.categories;
    const nextProducts = attachCategoryNames(nextCategories, catalog.products);

    setCategories(nextCategories);
    setProducts(nextProducts);
    setSelectedCategoryId((prev) => {
      const exists = nextCategories.some((cat) => cat.id === prev);
      return exists ? prev : nextCategories[0]?.id ?? '';
    });
  }, []);

  const loadCatalog = useCallback(async () => {
    const cachedCatalog = hasRemoteCatalogAccess ? await getCachedCatalog() : null;

    if (cachedCatalog) {
      applyCatalog(cachedCatalog);
      setCatalogLoading(false);
    } else {
      setCatalogLoading(true);
    }

    setCatalogError(null);

    try {
      const catalog = await fetchCatalog();
      applyCatalog(catalog);
    } catch (error) {
      if (hasRemoteCatalogAccess) {
        if (!cachedCatalog) {
          setCategories([]);
          setProducts([]);
          setSelectedCategoryId('');
          setCatalogError(error instanceof Error ? error.message : 'Gagal memuat katalog.');
        }
      } else {
        setCategories(CATEGORIES);
        setProducts(attachCategoryNames(CATEGORIES, PRODUCTS));
        setSelectedCategoryId((prev) => (prev ? prev : CATEGORIES[0]?.id ?? ''));
      }
    } finally {
      setCatalogLoading(false);
    }
  }, [applyCatalog]);

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
