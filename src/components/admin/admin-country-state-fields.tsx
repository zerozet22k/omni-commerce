"use client";

import { useMemo, useState } from "react";

type CountryOption = {
  id: string;
  label: string;
};

type StateOption = {
  id: string;
  label: string;
  countryId?: string;
};

export function AdminCountryStateSelectFields({
  countryOptions,
  stateOptions,
  defaultCountryId = "",
  defaultStateId = "",
  countryName = "countryId",
  stateName = "stateRegionId",
  countryLabel = "Country",
  stateLabel = "State / region",
  anyCountryLabel = "Any country",
  anyStateLabel = "Any state / region",
}: {
  countryOptions: CountryOption[];
  stateOptions: StateOption[];
  defaultCountryId?: string;
  defaultStateId?: string;
  countryName?: string;
  stateName?: string;
  countryLabel?: string;
  stateLabel?: string;
  anyCountryLabel?: string;
  anyStateLabel?: string;
}) {
  const initialCountryId =
    defaultCountryId ||
    stateOptions.find((option) => option.id === defaultStateId)?.countryId ||
    "";
  const [countryId, setCountryId] = useState(initialCountryId);
  const [stateRegionId, setStateRegionId] = useState(defaultStateId);

  const filteredStateOptions = useMemo(
    () =>
      countryId
        ? stateOptions.filter((option) => option.countryId === countryId)
        : [],
    [countryId, stateOptions],
  );
  const selectedStateRegionId =
    stateRegionId &&
    filteredStateOptions.some((option) => option.id === stateRegionId)
      ? stateRegionId
      : "";

  const countryPlaceholder =
    countryOptions.length > 0 ? anyCountryLabel : "No countries configured";
  const statePlaceholder = !countryId
    ? countryOptions.length > 0
      ? "Select a country first"
      : "No states / regions configured"
    : filteredStateOptions.length > 0
      ? anyStateLabel
      : "No states / regions for this country";

  return (
    <>
      <label className="grid min-w-0 gap-2">
        <span className="text-sm font-semibold text-slate-700">{countryLabel}</span>
        <select
          className="block w-full min-w-0 rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
          name={countryName}
          onChange={(event) => setCountryId(event.target.value)}
          value={countryId}
        >
          <option value="">{countryPlaceholder}</option>
          {countryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid min-w-0 gap-2">
        <span className="text-sm font-semibold text-slate-700">{stateLabel}</span>
        <select
          className="block w-full min-w-0 rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!countryId || filteredStateOptions.length === 0}
          name={stateName}
          onChange={(event) => setStateRegionId(event.target.value)}
          value={selectedStateRegionId}
        >
          <option value="">{statePlaceholder}</option>
          {filteredStateOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
