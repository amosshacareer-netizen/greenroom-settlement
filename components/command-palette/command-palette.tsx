"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShowEntry = {
  id: string;
  artistName: string;
  dateFormatted: string;
  dealType: string | null;
  guaranteeFormatted: string | null;
};

export type ArtistEntry = {
  name: string;
  genre: string | null;
  showCount: number;
};

type Props = {
  shows: ShowEntry[];
  artists: ArtistEntry[];
};

type ResultItem =
  | { kind: "show"; entry: ShowEntry }
  | { kind: "artist"; entry: ArtistEntry };

export function CommandPalette({ shows, artists }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Toggle on Cmd/Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened, reset state
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Filter results
  const results = useMemo<ResultItem[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matchedShows = shows
      .filter((s) => s.artistName.toLowerCase().includes(q))
      .slice(0, 5)
      .map((entry): ResultItem => ({ kind: "show", entry }));

    const matchedArtists = artists
      .filter((a) => a.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((entry): ResultItem => ({ kind: "artist", entry }));

    return [...matchedShows, ...matchedArtists];
  }, [query, shows, artists]);

  // Navigate to a result
  const navigate = useCallback(
    (item: ResultItem) => {
      if (item.kind === "show") {
        router.push(`/shows/${item.entry.id}`);
      }
      // Artists are not linkable
      setOpen(false);
    },
    [router],
  );

  // Keyboard navigation inside the modal
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex]);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector("[data-active='true']");
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!open) return null;

  // Split results into groups for rendering
  const showResults = results.filter(
    (r): r is ResultItem & { kind: "show" } => r.kind === "show",
  );
  const artistResults = results.filter(
    (r): r is ResultItem & { kind: "artist" } => r.kind === "artist",
  );

  // Compute a flat index offset for artist group
  const artistOffset = showResults.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
        aria-hidden
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-lg bg-white rounded-lg shadow-2xl shadow-ink-900/10",
          "ring-1 ring-ink-200/60 overflow-hidden",
          "animate-[scaleIn_150ms_ease-out]",
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-ink-200/60">
          <Search className="h-4 w-4 text-ink-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search shows and artists..."
            className={cn(
              "flex-1 h-12 text-[16px] text-ink-900 placeholder:text-ink-400",
              "bg-transparent border-none outline-none",
            )}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 bg-ink-100 rounded border border-ink-200/60">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-[14px] text-ink-400">
              No results for &ldquo;{query.trim()}&rdquo;
            </div>
          )}

          {showResults.length > 0 && (
            <div className="px-2 pt-2 pb-1">
              <div className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Shows
              </div>
              {showResults.map((item, i) => (
                <button
                  key={item.entry.id}
                  data-active={activeIndex === i}
                  onClick={() => navigate(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                    activeIndex === i
                      ? "bg-brand-50 text-ink-900"
                      : "text-ink-700 hover:bg-ink-50",
                  )}
                >
                  <Calendar
                    className={cn(
                      "h-4 w-4 shrink-0",
                      activeIndex === i ? "text-brand-700" : "text-ink-400",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">
                      {item.entry.artistName}
                    </div>
                    <div className="text-[12px] text-ink-400 flex items-center gap-1.5">
                      <span>{item.entry.dateFormatted}</span>
                      {item.entry.dealType && (
                        <>
                          <span className="text-ink-300">·</span>
                          <span>{item.entry.dealType}</span>
                        </>
                      )}
                      {item.entry.guaranteeFormatted && (
                        <>
                          <span className="text-ink-300">·</span>
                          <span>{item.entry.guaranteeFormatted}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-opacity",
                      activeIndex === i
                        ? "text-brand-700 opacity-100"
                        : "opacity-0",
                    )}
                  />
                </button>
              ))}
            </div>
          )}

          {artistResults.length > 0 && (
            <div className="px-2 pt-2 pb-1">
              <div className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Artists
              </div>
              {artistResults.map((item, i) => {
                const flatIndex = artistOffset + i;
                return (
                  <div
                    key={item.entry.name}
                    data-active={activeIndex === flatIndex}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                      activeIndex === flatIndex
                        ? "bg-brand-50 text-ink-900"
                        : "text-ink-700 hover:bg-ink-50",
                    )}
                  >
                    <Users
                      className={cn(
                        "h-4 w-4 shrink-0",
                        activeIndex === flatIndex
                          ? "text-brand-700"
                          : "text-ink-400",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium truncate">
                        {item.entry.name}
                      </div>
                      <div className="text-[12px] text-ink-400 flex items-center gap-1.5">
                        <span>
                          {item.entry.showCount}{" "}
                          {item.entry.showCount === 1 ? "show" : "shows"}
                        </span>
                        {item.entry.genre && (
                          <>
                            <span className="text-ink-300">·</span>
                            <span>{item.entry.genre}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-8 text-center text-[14px] text-ink-400">
              Start typing to search...
            </div>
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-ink-200/60 flex items-center gap-3 text-[11px] text-ink-400">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center w-4 h-4 rounded bg-ink-100 border border-ink-200/60 text-[9px] font-medium">
                &uarr;
              </kbd>
              <kbd className="inline-flex items-center justify-center w-4 h-4 rounded bg-ink-100 border border-ink-200/60 text-[9px] font-medium">
                &darr;
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center px-1.5 h-4 rounded bg-ink-100 border border-ink-200/60 text-[9px] font-medium">
                &crarr;
              </kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center px-1.5 h-4 rounded bg-ink-100 border border-ink-200/60 text-[9px] font-medium">
                esc
              </kbd>
              close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
