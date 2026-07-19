import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useQueryString = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback(
    (name: string): string | null => searchParams.get(name),
    [searchParams],
  );

  const setParam = useCallback(
    (name: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(name, value);
        return next;
      });
    },
    [setSearchParams],
  );

  const removeParam = useCallback(
    (name: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(name);
        return next;
      });
    },
    [setSearchParams],
  );

  const setParams = useCallback(
    (entries: Record<string, string>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(entries).forEach(([key, value]) => {
          if (value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        });
        return next;
      });
    },
    [setSearchParams],
  );

  const getAllParams = useCallback((): Record<string, string> => {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [searchParams]);

  const clearParams = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return {
    getParam,
    setParam,
    removeParam,
    setParams,
    getAllParams,
    clearParams,
    searchParams,
  };
};