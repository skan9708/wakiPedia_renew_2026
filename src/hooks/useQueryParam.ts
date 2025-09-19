import { useSearchParams } from 'react-router-dom';

export function useQueryParam(key: string): [string | null, (value: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const set = (value: string | null) => {
    const next = new URLSearchParams(params);
    if (value == null || value === '') next.delete(key);
    else next.set(key, value);
    setParams(next);
  };
  return [params.get(key), set];
}


