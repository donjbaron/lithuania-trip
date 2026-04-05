"use client";

import { useState } from "react";
import { backfillActivityAddresses } from "@/app/actions/activities";

export default function BackfillAddressesButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setRunning(true);
    setResult(null);
    const { updated } = await backfillActivityAddresses();
    setRunning(false);
    setResult(`Updated ${updated} activit${updated !== 1 ? "ies" : "y"}`);
    setTimeout(() => setResult(null), 4000);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={running}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
      >
        {running
          ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        }
        {running ? "Finding addresses…" : "Find missing addresses"}
      </button>
      {result && <span className="text-xs text-green-600 font-medium">{result}</span>}
    </div>
  );
}
