"use client";
import { useState } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { UploadIcon, ChartIcon, LockIcon, DocumentIcon, CheckIcon, InfoIcon, WarningIcon } from "@/components/Icons";

type UploadSectionProps = {
  userRole?: string;
};

export default function UploadSection({ userRole }: UploadSectionProps) {
  const canUpload = userRole === "ADMIN" || userRole === "ANALYST";
  const toast = useToastContext();
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    inserted: number;
    skipped: number;
    cloud: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    if (!fileInput?.files?.[0]) {
      toast.error("Please choose a CSV file.");
      return;
    }

    const file = fileInput.files[0];
    
    // File validation
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a CSV file.");
      return;
    }
    
    if (file.size === 0) {
      toast.error("The file is empty. Please choose a valid CSV file.");
      return;
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 10MB. Please upload a smaller file.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    setLoading(true);
    setUploadResult(null);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "File uploaded successfully!");
        setUploadResult({
          inserted: data.inserted || 0,
          skipped: data.skipped || 0,
          cloud: data.message?.includes("AWS") ? "AWS" : data.message?.includes("GCP") ? "GCP" : "Unknown",
        });
        fileInput.value = "";
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error("Network error");
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.files = e.dataTransfer.files;
        const form = fileInput.closest("form");
        if (form) {
          const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <UploadIcon className="w-6 h-6 text-blue-500" />
          Upload Billing CSV
        </h2>
        <p className="text-gray-400 text-sm mt-1.5 font-medium">
          {canUpload 
            ? "Upload AWS or GCP billing CSV files. Invalid rows will be skipped automatically."
            : "You have read-only access. Only Admin and Analyst roles can upload CSV files."}
        </p>
      </div>

      {!canUpload ? (
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-600/50 rounded-lg p-8 text-center shadow-sm">
          <LockIcon className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">Read-Only Access</h3>
          <p className="text-gray-300 text-sm mb-4">
            You are logged in as a <strong>Viewer</strong>. Viewers can view dashboards and analytics but cannot upload files or make changes.
          </p>
          <p className="text-gray-400 text-xs">
            Contact your administrator if you need upload permissions.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <form onSubmit={onSubmit} className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              role="button"
              tabIndex={canUpload && !loading ? 0 : -1}
              aria-label="File upload drop zone"
              aria-disabled={loading || !canUpload}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && canUpload && !loading) {
                  e.preventDefault();
                  document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
                }
              }}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragActive
                  ? "border-blue-500 bg-blue-900/20"
                  : "border-gray-600 hover:border-gray-500 bg-gray-800/30"
              } ${canUpload && !loading ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800" : ""}`}
            >
              <input
                name="file"
                type="file"
                accept=".csv"
                aria-label="Upload CSV file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading || !canUpload}
                onChange={(e) => {
                  if (e.target.files?.[0] && canUpload) {
                    const form = e.target.closest("form");
                    if (form) {
                      form.requestSubmit();
                    }
                  }
                }}
              />
              <div className="space-y-2" aria-hidden="true">
                <DocumentIcon className="w-12 h-12 mx-auto text-gray-500" />
                <div>
                  <span className="text-blue-400 font-medium">Click to upload</span> or drag and drop
                </div>
                <p className="text-xs text-gray-400">CSV files only (AWS or GCP billing format)</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !canUpload}
              aria-label={loading ? "Uploading file..." : "Upload CSV file"}
              aria-busy={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md disabled:shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                "Upload CSV"
              )}
            </button>
          </form>

        {uploadResult && (
          <div className="mt-4 p-5 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-700/50 rounded-lg animate-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
              <ChartIcon className="w-4 h-4" />
              Upload Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-md p-3 shadow-sm border border-gray-700/50">
                <div className="text-xs text-blue-400 font-medium mb-1">Cloud Provider</div>
                <div className="text-lg font-bold text-blue-300">{uploadResult.cloud}</div>
              </div>
              <div className="bg-gray-800/50 rounded-md p-3 shadow-sm border border-gray-700/50">
                <div className="text-xs text-green-400 font-medium mb-1">Inserted</div>
                <div className="text-lg font-bold text-green-300">{uploadResult.inserted} rows</div>
              </div>
              <div className="bg-gray-800/50 rounded-md p-3 shadow-sm border border-gray-700/50">
                <div className="text-xs text-gray-400 font-medium mb-1">Skipped</div>
                <div className="text-lg font-bold text-gray-300">{uploadResult.skipped} rows</div>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <DocumentIcon className="w-4 h-4 text-blue-500" />
          CSV Format Requirements
        </h3>
        <ul className="text-xs text-gray-300 space-y-2">
          <li className="flex items-start gap-2">
            <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span><strong>Required columns:</strong> date, service, cost_usd (or equivalent)</span>
          </li>
          <li className="flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span><strong>Optional columns:</strong> account_id/project_id, team, env</span>
          </li>
          <li className="flex items-start gap-2">
            <WarningIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <span>Invalid rows are automatically skipped</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Duplicate rows are automatically deduplicated</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
