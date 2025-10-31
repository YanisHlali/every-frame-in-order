import { useState, useCallback, useRef, useEffect } from 'react';
import { Frame, Pagination, FramesApiResponse } from '../types';

interface UseFramesOptions {
  initialFrames?: Frame[];
  autoLoad?: boolean;
  framesPerPage?: number;
}

interface UseFramesReturn {
  frames: Frame[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  selectedSeason: string;
  selectedEpisode: string;
  loadFrames: (season?: string, episode?: string) => Promise<void>;
  loadMoreFrames: () => Promise<void>;
  reset: () => void;
  setFilters: (season: string, episode: string) => void;
  hasMoreFrames: boolean;
}

class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

const CACHE_DURATION = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 50; // Limit cache to 50 entries
const framesCache = new LRUCache<string, { data: FramesApiResponse; timestamp: number }>(MAX_CACHE_SIZE);

function getCacheKey(season?: string, episode?: string, page = 1) {
  return `${season || 'all'}-${episode || 'all'}-page-${page}`;
}

function getCachedData(key: string): FramesApiResponse | null {
  const cached = framesCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    framesCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedData(key: string, data: FramesApiResponse): void {
  framesCache.set(key, { data, timestamp: Date.now() });
}

export function useFrames({
  initialFrames = [],
  autoLoad = false,
  framesPerPage
}: UseFramesOptions = {}): UseFramesReturn {
  const [frames, setFrames] = useState<Frame[]>(initialFrames);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreFrames, setHasMoreFrames] = useState(true);
  
  const abortControllerRef = useRef<AbortController>();
  const currentRequestRef = useRef<string>();

  const loadFrames = useCallback(async (
    season?: string, 
    episode?: string,
    page = 1,
    append = false
  ) => {
    const cacheKey = getCacheKey(season, episode, page);
    const cachedData = getCachedData(cacheKey);

    if (cachedData && cachedData.success) {
      if (append) {
        setFrames(prev => [...prev, ...cachedData.frames]);
      } else {
        setFrames(cachedData.frames);
      }
      setPagination(cachedData.pagination);
      setError(null);
      setHasMoreFrames(cachedData.pagination ? cachedData.pagination.hasNextPage : false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const requestId = `${season || 'all'}-${episode || 'all'}-${page}`;
    currentRequestRef.current = requestId;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(framesPerPage !== undefined && { limit: framesPerPage.toString() }),
        ...(season && { season }),
        ...(episode && { episode })
      });

      const response = await fetch(`/api/frames?${params}`, {
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FramesApiResponse = await response.json();

      if (currentRequestRef.current !== requestId) {
        return;
      }

      if (data.success) {
        setCachedData(cacheKey, data);
        if (append) {
          setFrames(prev => [...prev, ...data.frames]);
        } else {
          setFrames(data.frames);
          setCurrentPage(1);
        }
        setPagination(data.pagination);
        setHasMoreFrames(data.pagination ? data.pagination.hasNextPage : false);
      } else {
        throw new Error(data.message || 'Failed to load frames');
      }
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError') {
        return;
      }

      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      if (!append) {
        setFrames([]);
        setPagination(null);
      }
    } finally {
      if (currentRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [framesPerPage]);

  const loadMoreFrames = useCallback(async () => {
    if (!hasMoreFrames || isLoading) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadFrames(selectedSeason || undefined, selectedEpisode || undefined, nextPage, true);
  }, [hasMoreFrames, isLoading, currentPage, selectedSeason, selectedEpisode, loadFrames]);

  const setFilters = useCallback((season: string, episode: string) => {
    setSelectedSeason(season);
    setSelectedEpisode(episode);
    setCurrentPage(1);
    setHasMoreFrames(true);
    loadFrames(season || undefined, episode || undefined, 1, false);
  }, [loadFrames]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setFrames(initialFrames);
    setPagination(null);
    setIsLoading(false);
    setError(null);
    setSelectedSeason('');
    setSelectedEpisode('');
    setCurrentPage(1);
    setHasMoreFrames(true);
    currentRequestRef.current = undefined;
  }, [initialFrames]);

  useEffect(() => {
    if (autoLoad && frames.length === 0 && !isLoading) {
      loadFrames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    frames,
    pagination,
    isLoading,
    error,
    selectedSeason,
    selectedEpisode,
    loadFrames: (season?: string, episode?: string) => loadFrames(season, episode, 1, false),
    loadMoreFrames,
    reset,
    setFilters,
    hasMoreFrames
  };
}