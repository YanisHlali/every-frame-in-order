import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Frame } from "../types";

interface FrameViewerProps {
  frames: Frame[];
  isLoading?: boolean;
  hasMoreFrames?: boolean;
  onLoadMore?: () => void;
}

export default function FrameViewer({
  frames,
  isLoading = false,
  hasMoreFrames = false,
  onLoadMore,
}: FrameViewerProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [isZoomed, setIsZoomed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [frameInput, setFrameInput] = useState("");

  const navigateFrame = useCallback((direction: "prev" | "next") => {
    if (frames.length === 0) return;

    if (direction === "prev" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === "next") {
      if (currentIndex < frames.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (hasMoreFrames && onLoadMore) {
        onLoadMore();
      }
    }
  }, [currentIndex, frames, hasMoreFrames, onLoadMore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          navigateFrame("prev");
          break;
        case "ArrowRight":
          e.preventDefault();
          navigateFrame("next");
          break;
        case "Escape":
          e.preventDefault();
          break;
        case " ":
          e.preventDefault();
          setIsZoomed(!isZoomed);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, frames, isZoomed, navigateFrame]);

  useEffect(() => {
    if (frames.length === 0) return;

    const preloadImages = [];
    for (let i = -2; i <= 2; i++) {
      const index = currentIndex + i;
      if (index >= 0 && index < frames.length && index !== currentIndex) {
        preloadImages.push(frames[index]);
      }
    }

    const imageElements: HTMLImageElement[] = [];

    preloadImages.forEach((frame) => {
      if (!loadedImages.has(frame.id) && typeof window !== "undefined") {
        const img = new window.Image();
        img.src = `/api/image-proxy?url=${encodeURIComponent(frame.url)}`;
        img.onload = () => {
          setLoadedImages((prev) => new Set(prev).add(frame.id));
        };
        imageElements.push(img);
      }
    });

    return () => {
      imageElements.forEach((img) => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      });
    };
  }, [currentIndex, frames, loadedImages]);

  useEffect(() => {
    if (frames.length > 0) {
      setCurrentIndex(0);
      setFrameInput(frames[0]?.frameNumber?.toString() || "1");
    }
  }, [frames]);

  useEffect(() => {
    if (frames[currentIndex]) {
      setFrameInput(frames[currentIndex].frameNumber.toString());
    }
  }, [currentIndex, frames]);

  const handleImageError = useCallback((frameId: string) => {
    setImageErrors((prev) => new Set(prev).add(frameId));
  }, []);

  const handleImageLoad = useCallback((frameId: string) => {
    setLoadedImages((prev) => new Set(prev).add(frameId));
  }, []);

  const goToFrame = (frameNumber: number) => {
    const frameIndex = frames.findIndex((f) => f.frameNumber === frameNumber);
    if (frameIndex !== -1) {
      setCurrentIndex(frameIndex);
      return true;
    }
    return false;
  };

  const handleFrameInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const frameNumber = parseInt(frameInput);

    if (isNaN(frameNumber) || frameNumber <= 0) {
      return;
    }

    const maxFrameNumber = frames.length > 0
      ? Math.max(...frames.map(f => f.frameNumber))
      : 0;

    const cappedFrameNumber = Math.min(frameNumber, maxFrameNumber + 1000);

    const success = goToFrame(cappedFrameNumber);
    if (!success) {
      const sortedFrames = [...frames].sort(
        (a, b) => a.frameNumber - b.frameNumber
      );

      if (sortedFrames.length === 0) return;

      let closestIndex = 0;
      let minDiff = Math.abs(sortedFrames[0].frameNumber - cappedFrameNumber);

      for (let i = 1; i < sortedFrames.length; i++) {
        const diff = Math.abs(sortedFrames[i].frameNumber - cappedFrameNumber);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }

      const closestFrame = sortedFrames[closestIndex];
      const actualIndex = frames.findIndex((f) => f.id === closestFrame.id);
      setCurrentIndex(actualIndex);
      setFrameInput(closestFrame.frameNumber.toString());
    }
  };

  const currentFrame = frames[currentIndex];

  return (
    <>
      <div className="space-y-6">
        {frames.length > 0 && currentFrame ? (
          <div className="flex flex-col items-center space-y-6">
            <div className="w-full max-w-5xl">
              <Card className="overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl shadow-black/10 dark:shadow-black/30 border-2 border-gray-200 dark:border-zinc-700 hover:border-blue-300 transition-all duration-300">
                <div className="aspect-video relative bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 overflow-hidden">
                  {!imageErrors.has(currentFrame.id) ? (
                    <>
                      <Image
                        src={`/api/image-proxy?url=${encodeURIComponent(currentFrame.url)}`}
                        alt={`Frame ${currentFrame.frameNumber} from ${currentFrame.seasonKey.replace('season-', 'Season ')} ${currentFrame.episodeId.replace('episode-', 'Episode ')}`}
                        className={`w-full h-full object-contain transition-all duration-500 hover:brightness-105 ${
                          isZoomed
                            ? "scale-150 cursor-zoom-out z-20"
                            : "cursor-zoom-in"
                        }`}
                        loading="eager"
                        width={1280}
                        height={720}
                        onClick={() => setIsZoomed(!isZoomed)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setIsZoomed(!isZoomed);
                          }
                        }}
                        onLoad={() => handleImageLoad(currentFrame.id)}
                        onError={() => handleImageError(currentFrame.id)}
                        tabIndex={0}
                        role="button"
                        aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
                      />
                      {!loadedImages.has(currentFrame.id) && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
                          <div className="relative">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-800"></div>
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 absolute inset-0"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800 text-gray-600 dark:text-zinc-300">
                      <div className="text-center p-8">
                        <div className="text-6xl mb-4 opacity-40">🎬</div>
                        <div className="text-xl font-medium mb-2">
                          Image unavailable
                        </div>
                        <div className="text-sm opacity-75 bg-white/20 dark:bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full inline-block">
                          Frame #{currentFrame.frameNumber}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={`p-6 bg-gradient-to-r from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-800 border-t border-gray-200 dark:border-zinc-700 transition-opacity duration-300 ${
                    isZoomed ? "opacity-30 pointer-events-none" : "opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                        Frame #{currentFrame.frameNumber}
                      </h3>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                        {currentFrame.seasonKey.replace("season-", "Season ")} -{" "}
                        {currentFrame.episodeId.replace("episode-", "Episode ")}
                      </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => navigateFrame("prev")}
                        disabled={currentIndex === 0}
                        className="px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                        aria-label="Go to previous frame"
                      >
                        ← Previous
                      </Button>

                      <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2" role="navigation" aria-label="Frame navigation">
                        <label htmlFor="frame-input" className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                          Frame:
                        </label>
                        <form
                          onSubmit={handleFrameInputSubmit}
                          className="flex items-center"
                          aria-label="Jump to specific frame"
                        >
                          <input
                            id="frame-input"
                            type="number"
                            value={frameInput}
                            onChange={(e) => setFrameInput(e.target.value)}
                            className="w-24 px-3 py-1.5 text-sm font-mono rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all duration-200 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            max={frames.length > 0 ? Math.max(...frames.map(f => f.frameNumber)) + 1000 : undefined}
                            placeholder="#"
                            aria-label="Jump to frame number"
                            aria-describedby="frame-count"
                          />
                        </form>
                        <span id="frame-count" className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                          / {frames.length.toLocaleString()}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => navigateFrame("next")}
                        disabled={
                          currentIndex === frames.length - 1 && !hasMoreFrames
                        }
                        className="px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                        aria-label="Go to next frame"
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
