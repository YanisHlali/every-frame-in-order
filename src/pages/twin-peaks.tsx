import { GetServerSideProps } from "next";
import Head from "next/head";
import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { ThemeToggle } from "../components/ThemeToggle";
import FrameViewer from "../components/FrameViewer";
import { useFrames } from "../hooks/useFrames";
import LoadingSpinner from "../components/LoadingSpinner";
import { ContentData } from "../types";

interface TwinPeaksPageProps {
  contentData: ContentData | null;
  error?: string;
}

function getEpisodeLimitsFromContent(contentData: ContentData | null) {
  if (!contentData) return {};
  const limits: Record<string, number | null> = {};
  
  for (const [seasonKey, seasonData] of Object.entries(contentData.items)) {
    if (seasonData.current?.episodeId) {
      const match = seasonData.current.episodeId.match(/episode-(\d+)/);
      const epNum = match ? parseInt(match[1], 10) : null;
      limits[seasonKey] = epNum && epNum > 1 ? epNum - 1 : null;
    } else {
      limits[seasonKey] = null;
    }
  }
  
  return limits;
}

export default function TwinPeaksPage({
  contentData,
  error,
}: TwinPeaksPageProps) {
  const {
    frames: allFrames,
    isLoading,
    error: framesError,
    selectedSeason,
    selectedEpisode,
    loadFrames,
    loadMoreFrames,
    setFilters,
    hasMoreFrames,
  } = useFrames({
    autoLoad: true,
  });

  const EPISODE_LIMITS = getEpisodeLimitsFromContent(contentData);
  
  const frames = allFrames.filter(f => {
    const seasonLimit = EPISODE_LIMITS[f.seasonKey];
    
    if (seasonLimit !== null && seasonLimit !== undefined && typeof seasonLimit === 'number') {
      const match = f.episodeId.match(/episode-(\d+)/);
      const epNum = match ? parseInt(match[1], 10) : null;
      
      if (epNum === null) {
        return false;
      }
      
      return epNum <= seasonLimit;
    }
    
    return true;
  });

  useEffect(() => {
    if (
      contentData?.current !== undefined &&
      !selectedSeason &&
      !selectedEpisode
    ) {
      const currentSeasonKey = contentData.order[contentData.current];
      const currentSeason = contentData.items[currentSeasonKey];
      if (currentSeason?.current?.episodeId) {
        setFilters(currentSeasonKey, currentSeason.current.episodeId);
      }
    }
  }, [contentData, selectedSeason, selectedEpisode, setFilters]);

  const handleFilterChange = (season: string, episode: string) => {
    setFilters(season, episode);
  };

  if (error) {
    return (
      <main className="container mx-auto py-10 px-4 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Reload page
        </Button>
      </main>
    );
  }

  if (!contentData) {
    return (
      <main className="container mx-auto py-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">No data available</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Unable to load series data.
        </p>
      </main>
    );
  }

  const seasons: [string, typeof contentData.items[string]][] = contentData.order
    .map((seasonId: string) => [seasonId, contentData.items[seasonId]] as [string, typeof contentData.items[string]])
    .filter(([season]) => !!season);

  const selectedSeasonData = selectedSeason
    ? contentData.items[selectedSeason]
    : null;
  let episodes: [string, any][] = [];
  if (selectedSeasonData) {
    episodes = Object.entries(selectedSeasonData.episodes || {})
      .sort((a, b) => {
        const numA = a[1]?.episodeNumber ?? parseInt(a[0].replace('episode-', '')) ?? 0;
        const numB = b[1]?.episodeNumber ?? parseInt(b[0].replace('episode-', '')) ?? 0;
        return numA - numB;
      });
  }
  
  const hasEpisodesInSeason = selectedSeasonData && episodes.length > 0;

  const getEmptyStateMessage = () => {
    if (selectedSeason && !hasEpisodesInSeason) {
      return `No episodes found for ${selectedSeason.replace('season-', 'Season ')}`;
    }
    if (selectedEpisode && !frames.length && !isLoading) {
      return `No frames found for the selected episode`;
    }
    return "Searching for frames...";
  };

  const displayError = framesError || error;

  return (
    <>
      <Head>
        <title>Twin Peaks</title>
        <meta name="description" content="Browse and explore every frame from the Twin Peaks series." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎬</text></svg>" />
      </Head>
      <main className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <header className="bg-white dark:bg-zinc-800 shadow-sm border-b border-gray-200 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                🎬 Twin Peaks
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Season:
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => handleFilterChange(e.target.value, "")}
                className="px-3 py-1.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {seasons.length === 0 && (
                  <option value="">All seasons</option>
                )}
                {seasons.length > 0 && seasons.map(([seasonId, seasonData]) => {
                  let label: string;
                  if (seasonId.startsWith("season-")) {
                    label = (seasonId as string).replace("season-", "Season ");
                  } else {
                    label = (seasonData && seasonData.title) ? seasonData.title : seasonId;
                  }
                  return (
                    <option key={seasonId as string} value={seasonId as string}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedSeason && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Episode:
                </label>
                <select
                  value={selectedEpisode}
                  onChange={(e) =>
                    handleFilterChange(selectedSeason, e.target.value)
                  }
                  disabled={!hasEpisodesInSeason}
                  className="px-3 py-1.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {episodes.length === 0 && (
                    <option value="">
                      {hasEpisodesInSeason ? "All episodes" : "No episodes available"}
                    </option>
                  )}
                  {episodes.length > 0 && episodes.map(([episodeId, episode]) => (
                    <option key={episodeId} value={episodeId}>
                      Episode{" "}
                      {episode.episodeNumber ||
                        parseInt(episodeId.replace("episode-", "")) ||
                        0}{" "}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>


      {displayError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-red-600 dark:text-red-400">⚠️</span>
                <span className="text-red-800 dark:text-red-200 text-sm">
                  {displayError}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  loadFrames(
                    selectedSeason || undefined,
                    selectedEpisode || undefined
                  )
                }
                className="px-3 py-1.5 text-sm"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <FrameViewer
          frames={frames}
          isLoading={isLoading}
          hasMoreFrames={hasMoreFrames}
          onLoadMore={loadMoreFrames}
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <LoadingSpinner />
          </div>
        ) : !displayError && frames.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="text-6xl opacity-40">🎬</div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                {getEmptyStateMessage()}
              </h3>
              {selectedSeason && !hasEpisodesInSeason ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  This season doesn&apos;t contain any episodes yet.
                </p>
              ) : selectedEpisode && !frames.length ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Try selecting a different episode or check if data is available.
                </p>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Loading available content...
                </p>
              )}
              {(selectedSeason && !hasEpisodesInSeason) || (selectedEpisode && !frames.length && !isLoading) ? (
                <Button 
                  onClick={() => setFilters('', '')}
                  variant="outline"
                  className="mt-2"
                >
                  Back to all seasons
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const { getFirestore, getContentId } = require("../lib/firebase");

    const db = getFirestore();
    const contentId = getContentId();

    const contentDoc = await db.collection("content").doc(contentId).get();

    if (!contentDoc.exists) {
      return {
        props: {
          contentData: null,
          error: "Content data not found",
        },
      };
    }

    const contentData = contentDoc.data() as ContentData | undefined;

    let totalFrames = 0;
    if (contentData?.items) {
      Object.values(contentData.items).forEach((season: any) => {
        if (season.episodes) {
          Object.values(season.episodes).forEach((episode: any) => {
            totalFrames += episode.totalFiles || 0;
          });
        }
      });
    }

    return {
      props: {
        contentData: {
          title: contentData?.title || "Content",
          current: contentData?.current || 0,
          order: contentData?.order || [],
          items: contentData?.items || {},
        },
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);

    return {
      props: {
        contentData: null,
        error: "Error loading data",
      },
    };
  }
};
