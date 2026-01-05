import {useState, useCallback} from 'react';

interface UseRepCounterReturn {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setCount: (value: number) => void;
}

export function useRepCounter(initialCount = 0): UseRepCounterReturn {
  const [count, setCount] = useState(initialCount);

  const increment = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount(prev => Math.max(0, prev - 1));
  }, []);

  const reset = useCallback(() => {
    setCount(0);
  }, []);

  return {
    count,
    increment,
    decrement,
    reset,
    setCount,
  };
}
