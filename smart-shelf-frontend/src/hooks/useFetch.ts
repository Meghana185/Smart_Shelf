import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export function useFetch<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<T>(endpoint)
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'An error occurred');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  return { data, loading, error };
}
