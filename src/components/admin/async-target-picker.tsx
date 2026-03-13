"use client";

import clsx from "clsx";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useState,
} from "react";

type TargetOption = {
  id: string;
  label: string;
  caption?: string | null;
};

export function AdminAsyncTargetPicker({
  type,
  name,
  label,
  placeholder,
  description,
}: {
  type: "products" | "variants";
  name: string;
  label: string;
  placeholder: string;
  description?: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<TargetOption[]>([]);
  const [selected, setSelected] = useState<TargetOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useEffectEvent(async (nextQuery: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/catalog/target-search?type=${type}&q=${encodeURIComponent(nextQuery)}`,
        {
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        throw new Error("Search request failed.");
      }

      const payload = (await response.json()) as {
        items?: TargetOption[];
      };

      startTransition(() => {
        setResults(payload.items ?? []);
      });
    } catch {
      startTransition(() => {
        setResults([]);
        setError("Search could not be loaded.");
      });
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    const trimmedQuery = deferredQuery.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    void runSearch(trimmedQuery);
  }, [deferredQuery]);

  function selectItem(item: TargetOption) {
    startTransition(() => {
      setSelected(item);
      setResults([]);
      setQuery(item.label);
    });
  }

  function clearSelection() {
    startTransition(() => {
      setSelected(null);
      setQuery("");
      setResults([]);
      setError(null);
    });
  }

  return (
    <div className="space-y-3">
      <label className="grid gap-2" htmlFor={inputId}>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {description ? (
          <span className="text-xs leading-5 text-slate-500">{description}</span>
        ) : null}
        <input
          className="block w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
          id={inputId}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          value={query}
        />
      </label>

      {selected ? (
        <div className="flex items-start justify-between gap-3 rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-slate-950">
              {selected.label}
            </p>
            {selected.caption ? (
              <p className="mt-1 break-words text-xs text-slate-500">
                {selected.caption}
              </p>
            ) : null}
          </div>
          <button
            className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700"
            onClick={clearSelection}
            type="button"
          >
            Clear
          </button>
          <input name={name} type="hidden" value={selected.id} />
        </div>
      ) : null}

      <div
        className={clsx(
          "rounded-[1rem] border px-3 py-3",
          error ? "border-rose-200 bg-rose-50" : "border-stone-200 bg-white",
        )}
      >
        {query.trim().length < 2 ? (
          <p className="text-sm text-slate-500">Type at least 2 characters to search.</p>
        ) : isLoading ? (
          <p className="text-sm text-slate-500">Searching...</p>
        ) : error ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            {results.map((item) => (
              <button
                className="flex w-full items-start justify-between gap-3 rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3 py-2.5 text-left transition hover:border-sky-200 hover:bg-sky-50"
                key={item.id}
                onClick={() => selectItem(item)}
                type="button"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-900">
                    {item.label}
                  </p>
                  {item.caption ? (
                    <p className="mt-1 break-words text-xs text-slate-500">
                      {item.caption}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">
                  Select
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No matching records found.</p>
        )}
      </div>
    </div>
  );
}
