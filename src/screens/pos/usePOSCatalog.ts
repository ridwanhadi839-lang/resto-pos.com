import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { CATEGORIES, PRODUCTS } from '../../data/mockData';
import {
  getCachedCatalog,
  hasRemoteCatalogAccess,
  preloadCatalog,
} from '../../services/orderService';
import { useAuthStore } from '../../store/authStore';
import { Category, Product } from '../../types';

const CATALOG_FOCUS_REFRESH_INTERVAL_MS = 60 * 1000;

const attachCategoryNames = (categories: Category[], products: Product[]) => {
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  return products.map((product) => ({
    ...product,
    categoryName: categoryNameById.get(product.categoryId),
  }));
};

export const usePOSCatalog = () => {
  const restaurantCode = useAuthStore((s) => s.currentUser?.restaurantCode ?? null);
  const [categories, setCategories] = useState<Category[]>(hasRemoteCatalogAccess ? [] : CATEGORIES);
  const [products, setProducts] = useState<Product[]>(
    hasRemoteCatalogAccess ? [] : attachCategoryNames(CATEGORIES, PRODUCTS)
  );
  const [isCatalogLoading, setCatalogLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    hasRemoteCatalogAccess ? '' : CATEGORIES[0]?.id ?? ''
  );
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const lastSuccessfulLoadRef = useRef(0);
  const skipNextFocusRefreshRef = useRef(true);

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

  const loadCatalog = useCallback(
    async ({
      showLoader = true,
      forceRefresh = false,
    }: {
      showLoader?: boolean;
      forceRefresh?: boolean;
    } = {}) => {
    let cachedCatalog: { categories: Category[]; products: Product[] } | null = null;
    if (showLoader) {
      setCatalogLoading(true);
    }
    setCatalogError(null);

    try {
      cachedCatalog = hasRemoteCatalogAccess ? await getCachedCatalog(restaurantCode) : null;

      if (cachedCatalog) {
        applyCatalog(cachedCatalog);
        if (showLoader) {
          setCatalogLoading(false);
        }
      }

      const catalog = await preloadCatalog({ forceRefresh, restaurantCode });
      applyCatalog(catalog);
      lastSuccessfulLoadRef.current = Date.now();
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
    },
    [applyCatalog, restaurantCode]
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRefreshRef.current) {
        skipNextFocusRefreshRef.current = false;
        return undefined;
      }

      const hasLoadedCatalog = lastSuccessfulLoadRef.current > 0;
      const isStale =
        !hasLoadedCatalog ||
        Date.now() - lastSuccessfulLoadRef.current > CATALOG_FOCUS_REFRESH_INTERVAL_MS;

      if (isStale || Boolean(catalogError)) {
        void loadCatalog({
          showLoader: categories.length === 0,
          forceRefresh: isStale,
        });
      }

      return undefined;
    }, [catalogError, categories.length, loadCatalog])
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
