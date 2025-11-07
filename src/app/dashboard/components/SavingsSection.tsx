"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { useToastContext } from "@/contexts/ToastContext";
import { TableSkeleton } from "@/components/Skeleton";
import { LightbulbIcon, LockIcon, EditIcon, PlusIcon, SaveIcon, XIcon, TrashIcon } from "@/components/Icons";

type Idea = {
  id: string;
  title: string;
  service: string;
  est_monthly_saving_usd: number;
  confidence: number;
  owner: string;
  status: "PROPOSED" | "APPROVED" | "REALIZED";
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type FormData = {
  title: string;
  service: string;
  est_monthly_saving_usd: string;
  confidence: string;
  owner: string;
  status: "PROPOSED" | "APPROVED" | "REALIZED";
  notes: string;
};

type SavingsSectionProps = {
  userRole?: string;
};

export default function SavingsSection({ userRole }: SavingsSectionProps) {
  const canEdit = userRole === "ADMIN" || userRole === "ANALYST";
  const toast = useToastContext();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: "",
    title: "",
  });
  const [formData, setFormData] = useState<FormData>({
    title: "",
    service: "",
    est_monthly_saving_usd: "",
    confidence: "0.8",
    owner: "",
    status: "PROPOSED",
    notes: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function validateField(name: keyof FormData, value: string): string | undefined {
    switch (name) {
      case "title":
        if (!value.trim()) return "Title is required";
        if (value.trim().length < 3) return "Title must be at least 3 characters";
        break;
      case "service":
        if (!value.trim()) return "Service is required";
        break;
      case "est_monthly_saving_usd":
        if (!value) return "Estimated savings is required";
        const savings = parseFloat(value);
        if (isNaN(savings)) return "Must be a valid number";
        if (savings < 0) return "Savings must be positive";
        break;
      case "confidence":
        if (!value) return "Confidence is required";
        const conf = parseFloat(value);
        if (isNaN(conf)) return "Must be a valid number";
        if (conf < 0 || conf > 1) return "Confidence must be between 0 and 1";
        break;
      case "owner":
        if (!value.trim()) return "Owner is required";
        break;
      default:
        return undefined;
    }
    return undefined;
  }

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      const res = await fetch(`/api/savings?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load savings");
      const data = await res.json();
      setIdeas(data);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error("Failed to load savings");
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  function resetForm() {
    setFormData({
      title: "",
      service: "",
      est_monthly_saving_usd: "",
      confidence: "0.8",
      owner: "",
      status: "PROPOSED",
      notes: "",
    });
    setFieldErrors({});
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(idea: Idea) {
    if (!canEdit) {
      toast.error("You don't have permission to edit savings ideas.");
      return;
    }

    setFormData({
      title: idea.title,
      service: idea.service,
      est_monthly_saving_usd: idea.est_monthly_saving_usd.toString(),
      confidence: idea.confidence.toString(),
      owner: idea.owner,
      status: idea.status,
      notes: idea.notes || "",
    });
    setEditingId(idea.id);
    setShowForm(true);
    // Scroll to form
    setTimeout(() => {
      document.querySelector('[data-form="savings-form"]')?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Prevent submission if user doesn't have edit permissions
    if (!canEdit) {
      toast.error("You don't have permission to create or edit savings ideas.");
      return;
    }

    setSubmitting(true);

    // Validate all fields
    const errors: Partial<Record<keyof FormData, string>> = {};
    const fieldsToValidate: (keyof FormData)[] = ["title", "service", "est_monthly_saving_usd", "confidence", "owner"];
    
    fieldsToValidate.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) errors[field] = error;
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the form errors before submitting");
      setSubmitting(false);
      return;
    }

    setFieldErrors({});

    try {
      const url = "/api/savings";
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? {
            id: editingId,
            ...formData,
            est_monthly_saving_usd: parseFloat(formData.est_monthly_saving_usd),
            confidence: parseFloat(formData.confidence),
          }
        : {
            ...formData,
            est_monthly_saving_usd: parseFloat(formData.est_monthly_saving_usd),
            confidence: parseFloat(formData.confidence),
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Operation failed");
      }

      toast.success(editingId ? "Savings idea updated successfully! 🎉" : "Savings idea created successfully! 🎉");
      resetForm();
      await load();
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error("Operation failed");
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteModal(id: string, title: string) {
    if (!canEdit) {
      toast.error("You don't have permission to delete savings ideas.");
      return;
    }
    setDeleteModal({ isOpen: true, id, title });
  }

  async function handleDelete() {
    const { id } = deleteModal;
    try {
      const res = await fetch(`/api/savings?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Savings idea deleted successfully!");
      await load();
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error("Failed to delete");
      toast.error(error.message);
    }
  }

  const statusColors = {
    PROPOSED: "bg-yellow-100 text-yellow-800 border-yellow-300",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-300",
    REALIZED: "bg-green-100 text-green-800 border-green-300",
  };

  const totalSavings = ideas.reduce((sum, idea) => sum + Number(idea.est_monthly_saving_usd), 0);
  const realizedSavings = ideas
    .filter((i) => i.status === "REALIZED")
    .reduce((sum, idea) => sum + Number(idea.est_monthly_saving_usd) * Number(idea.confidence), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <LightbulbIcon className="w-6 h-6 text-blue-500" />
            Savings Pipeline
          </h2>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">
            {canEdit 
              ? "Track and manage cost-saving opportunities from proposal to realization."
              : "View cost-saving opportunities. You have read-only access."}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-300 font-medium">Status:</span>
            <select
              aria-label="Filter by status"
              className="border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white bg-gray-800/50 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="PROPOSED">Proposed</option>
              <option value="APPROVED">Approved</option>
              <option value="REALIZED">Realized</option>
            </select>
          </label>
          {canEdit && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              aria-label="Create new savings idea"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <span>+</span>
              <span>New Idea</span>
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            aria-label={loading ? "Refreshing savings ideas..." : "Refresh savings ideas"}
            aria-busy={loading}
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 active:bg-gray-500 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-600/50 rounded-lg p-4 text-center shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-center gap-2 text-sm text-yellow-300">
            <LockIcon className="w-4 h-4" />
            <span>
              <strong>Read-Only Access:</strong> You can view savings ideas but cannot create, edit, or delete them.
            </span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {ideas.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-700/50 rounded-lg">
            <div className="text-sm text-blue-300 font-medium mb-1">Total Potential Savings</div>
            <div className="text-2xl font-bold text-blue-200">
              ${totalSavings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-blue-300 mt-1">per month</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg">
            <div className="text-sm text-green-300 font-medium mb-1">Realized Savings</div>
            <div className="text-2xl font-bold text-green-200">
              ${realizedSavings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-green-300 mt-1">weighted by confidence</div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div
          data-form="savings-form"
          className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 rounded-lg shadow-md animate-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {editingId ? (
                <>
                  <EditIcon className="w-5 h-5 text-blue-500" />
                  Edit Savings Idea
                </>
              ) : (
                <>
                  <PlusIcon className="w-5 h-5 text-blue-500" />
                  Create New Savings Idea
                </>
              )}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-700/50"
              aria-label="Close form"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  className={`w-full border rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.title
                      ? "border-red-600/50 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-700 focus:ring-blue-500 focus:border-transparent"
                  }`}
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (fieldErrors.title) {
                      const error = validateField("title", e.target.value);
                      setFieldErrors((prev) => ({ ...prev, title: error }));
                    }
                  }}
                  onBlur={() => {
                    const error = validateField("title", formData.title);
                    setFieldErrors((prev) => ({ ...prev, title: error }));
                  }}
                  placeholder="e.g., Optimize EC2 instance types"
                  required
                  aria-invalid={!!fieldErrors.title}
                  aria-describedby={fieldErrors.title ? "title-error" : undefined}
                />
                {fieldErrors.title && (
                  <p id="title-error" className="mt-1 text-xs text-red-400" role="alert">
                    {fieldErrors.title}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Service *
                </label>
                <input
                  type="text"
                  className={`w-full border rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.service
                      ? "border-red-600/50 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-700 focus:ring-blue-500 focus:border-transparent"
                  }`}
                  value={formData.service}
                  onChange={(e) => {
                    setFormData({ ...formData, service: e.target.value });
                    if (fieldErrors.service) {
                      const error = validateField("service", e.target.value);
                      setFieldErrors((prev) => ({ ...prev, service: error }));
                    }
                  }}
                  onBlur={() => {
                    const error = validateField("service", formData.service);
                    setFieldErrors((prev) => ({ ...prev, service: error }));
                  }}
                  placeholder="e.g., EC2, S3, Cloud Storage"
                  required
                  aria-invalid={!!fieldErrors.service}
                  aria-describedby={fieldErrors.service ? "service-error" : undefined}
                />
                {fieldErrors.service && (
                  <p id="service-error" className="mt-1 text-xs text-red-400" role="alert">
                    {fieldErrors.service}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Est. Monthly Savings (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`w-full border rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.est_monthly_saving_usd
                      ? "border-red-600/50 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-700 focus:ring-blue-500 focus:border-transparent"
                  }`}
                  value={formData.est_monthly_saving_usd}
                  onChange={(e) => {
                    setFormData({ ...formData, est_monthly_saving_usd: e.target.value });
                    if (fieldErrors.est_monthly_saving_usd) {
                      const error = validateField("est_monthly_saving_usd", e.target.value);
                      setFieldErrors((prev) => ({ ...prev, est_monthly_saving_usd: error }));
                    }
                  }}
                  onBlur={() => {
                    const error = validateField("est_monthly_saving_usd", formData.est_monthly_saving_usd);
                    setFieldErrors((prev) => ({ ...prev, est_monthly_saving_usd: error }));
                  }}
                  placeholder="0.00"
                  required
                  aria-invalid={!!fieldErrors.est_monthly_saving_usd}
                  aria-describedby={fieldErrors.est_monthly_saving_usd ? "savings-error" : undefined}
                />
                {fieldErrors.est_monthly_saving_usd && (
                  <p id="savings-error" className="mt-1 text-xs text-red-400" role="alert">
                    {fieldErrors.est_monthly_saving_usd}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Confidence (0-1) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    className={`w-full border rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.confidence
                        ? "border-red-600/50 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-700 focus:ring-blue-500 focus:border-transparent"
                    }`}
                    value={formData.confidence}
                    onChange={(e) => {
                      setFormData({ ...formData, confidence: e.target.value });
                      if (fieldErrors.confidence) {
                        const error = validateField("confidence", e.target.value);
                        setFieldErrors((prev) => ({ ...prev, confidence: error }));
                      }
                    }}
                    onBlur={() => {
                      const error = validateField("confidence", formData.confidence);
                      setFieldErrors((prev) => ({ ...prev, confidence: error }));
                    }}
                    required
                    aria-invalid={!!fieldErrors.confidence}
                    aria-describedby={fieldErrors.confidence ? "confidence-error" : undefined}
                  />
                  {fieldErrors.confidence && (
                    <p id="confidence-error" className="mt-1 text-xs text-red-400" role="alert">
                      {fieldErrors.confidence}
                    </p>
                  )}
                  <div className="absolute right-3 top-2 text-xs text-gray-500">
                    {(parseFloat(formData.confidence) * 100 || 0).toFixed(0)}%
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Owner *
                </label>
                <input
                  type="text"
                  className={`w-full border rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.owner
                      ? "border-red-600/50 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-700 focus:ring-blue-500 focus:border-transparent"
                  }`}
                  value={formData.owner}
                  onChange={(e) => {
                    setFormData({ ...formData, owner: e.target.value });
                    if (fieldErrors.owner) {
                      const error = validateField("owner", e.target.value);
                      setFieldErrors((prev) => ({ ...prev, owner: error }));
                    }
                  }}
                  onBlur={() => {
                    const error = validateField("owner", formData.owner);
                    setFieldErrors((prev) => ({ ...prev, owner: error }));
                  }}
                  placeholder="Owner name or email"
                  required
                  aria-invalid={!!fieldErrors.owner}
                  aria-describedby={fieldErrors.owner ? "owner-error" : undefined}
                />
                {fieldErrors.owner && (
                  <p id="owner-error" className="mt-1 text-xs text-red-400" role="alert">
                    {fieldErrors.owner}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Status *
                </label>
                <select
                  className="w-full border border-gray-700 rounded-md px-3 py-2 text-sm text-white bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as "PROPOSED" | "APPROVED" | "REALIZED" })
                  }
                  required
                >
                  <option value="PROPOSED">Proposed</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REALIZED">Realized</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Notes
              </label>
              <textarea
                className="w-full border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or context..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {editingId ? (
                      <>
                        <SaveIcon className="w-4 h-4" />
                        Update
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-4 h-4" />
                        Create
                      </>
                    )}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 active:bg-gray-500 transition-all duration-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden shadow-sm">
        {loading && ideas.length === 0 ? (
          <div className="p-8">
            <TableSkeleton rows={5} />
          </div>
        ) : ideas.length === 0 ? (
          <div className="p-12 text-center">
            <LightbulbIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-300 text-lg font-medium mb-2">No savings ideas found</p>
            <p className="text-gray-400 text-sm mb-4">Create your first savings idea to get started!</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + Create First Idea
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-800 to-gray-800/80 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Est. Savings
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800/30">
                {ideas.map((idea, index) => (
                  <tr
                    key={idea.id}
                    className="hover:bg-gray-700/50 transition-colors duration-150 animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-white">{idea.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{idea.service}</td>
                    <td className="px-4 py-3 text-sm text-white font-semibold">
                      ${Number(idea.est_monthly_saving_usd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2 max-w-[60px]">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Number(idea.confidence) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-300 min-w-[35px]">
                          {(Number(idea.confidence) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{idea.owner}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${statusColors[idea.status]}`}
                      >
                        {idea.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(idea)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 px-2 py-1 rounded text-sm font-medium transition-all duration-150"
                            title="Edit"
                          >
                            <EditIcon className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(idea.id, idea.title)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-1 rounded text-sm font-medium transition-all duration-150"
                            title="Delete"
                            aria-label={`Delete ${idea.title}`}
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Read-only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", title: "" })}
        onConfirm={handleDelete}
        title="Delete Savings Idea"
        message={`Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
