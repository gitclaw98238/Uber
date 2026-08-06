import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../utils/errors';

export const useAsyncData = <T,>(loader: () => Promise<T>, deps: DependencyList = []) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loaderRef.current();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [depsKey, reload]);

  return { data, setData, loading, error, reload };
};
