"use client";
import { useEffect, useState } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Skeleton } from "@/components/Skeleton";
import { DocumentIcon, LightbulbIcon, InfoIcon, CopyIcon, CheckIcon, PlusIcon } from "@/components/Icons";

type Idea = { id: string; title: string; service: string };

type SavingsIdeaResponse = {
  id: string;
  title: string;
  service: string;
  [key: string]: unknown;
};

export default function PRHelperSection() {
  const toast = useToastContext();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [id, setId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoadingIdeas(true);
    fetch("/api/savings")
      .then((r) => r.json())
      .then((rows) => {
        setIdeas(
          (rows as SavingsIdeaResponse[]).map((r) => ({
            id: r.id,
            title: r.title,
            service: r.service,
          }))
        );
      })
      .catch(() => toast.error("Failed to load savings ideas"))
      .finally(() => setLoadingIdeas(false));
  }, [toast]);

  async function generate() {
    if (!id) {
      toast.warning("Please select a savings idea");
      return;
    }
    setLoading(true);
    setMarkdown("");
    setCopied(false);

    try {
      const res = await fetch("/api/pr-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (res.ok && data.markdown) {
        setMarkdown(data.markdown);
        toast.success("PR note generated successfully!");
      } else {
        toast.error(data.error || "Failed to generate PR note");
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error("Failed to generate PR note");
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!markdown) return;

    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      toast.error("Failed to copy to clipboard. Please copy manually.");
    }
  }

  const selectedIdea = ideas.find((i) => i.id === id);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <DocumentIcon className="w-6 h-6 text-blue-500" />
          PR Helper
        </h2>
        <p className="text-gray-400 text-sm mt-1.5 font-medium">
          Generate copy-ready Markdown PR notes for your savings ideas.
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Savings Idea
            </label>
            {loadingIdeas ? (
              <Skeleton variant="rectangular" className="h-10 w-full" />
            ) : (
              <select
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setMarkdown("");
                }}
                className="w-full border border-gray-700 rounded-md px-3 py-2 text-sm text-white bg-gray-800/50 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="">— Select a savings idea —</option>
                {ideas.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title} ({i.service})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-end">
            <button
              onClick={generate}
              disabled={!id || loading || loadingIdeas}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md disabled:shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4" />
                  <span>Generate Markdown</span>
                </>
              )}
            </button>
          </div>
        </div>

        {selectedIdea && !markdown && (
          <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg text-sm animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <span className="text-blue-300 font-medium">Selected:</span>
              <span className="text-blue-200 font-semibold">{selectedIdea.title}</span>
              <span className="text-blue-300">({selectedIdea.service})</span>
            </div>
          </div>
        )}

        {markdown && (
          <div className="mt-6 space-y-3 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <DocumentIcon className="w-4 h-4 text-blue-500" />
                Generated PR Note
              </h3>
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  copied
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600 shadow-sm hover:shadow-md"
                }`}
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-4 h-4" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>
            </div>
            <div className="border-2 border-gray-700 rounded-lg overflow-hidden shadow-inner">
              <pre className="p-5 bg-gray-900 text-gray-100 text-sm whitespace-pre-wrap font-mono overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
                {markdown}
              </pre>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-700/50 rounded-lg text-xs text-gray-300 flex items-start gap-2">
              <InfoIcon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>Click "Copy to Clipboard" to paste this into your PR description. The markdown is ready to use!</span>
            </div>
          </div>
        )}

        {!markdown && !loading && id && (
          <div className="mt-6 p-6 bg-gray-800/30 border border-gray-700/50 rounded-lg text-center">
            <DocumentIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-300 text-sm font-medium">Click "Generate Markdown" to create a PR note for the selected savings idea</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <DocumentIcon className="w-4 h-4 text-blue-500" />
          PR Note Includes
        </h3>
        <ul className="text-xs text-gray-300 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>Change description</strong> with service details</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span><strong>Savings calculation</strong> (estimated × confidence)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5">•</span>
            <span><strong>Pre-checks checklist</strong> for validation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5">•</span>
            <span><strong>Validation steps</strong> to ensure quality</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5">•</span>
            <span><strong>Rollback plan</strong> for safety</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
