"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useToastContext } from "@/contexts/ToastContext";
import { CardSkeleton } from "@/components/Skeleton";
import { MoneyIcon, ChartIcon, TrophyIcon, LineChartIcon, FlameIcon } from "@/components/Icons";

// Recharts must be client-only (avoid SSR warnings)
const ResponsiveContainer = dynamic(
  () => import("recharts").then(m => m.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(
  () => import("recharts").then(m => m.CartesianGrid),
  { ssr: false }
);
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
//const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });

type DailyPoint = { date: string; _sum: { cost_usd: string | number } };
type TopService = { service: string; _sum: { cost_usd: string | number } };
type ApiPayload = {
  daily: DailyPoint[];
  topServices: TopService[];
  availableTeams?: string[];
  availableEnvs?: string[];
};

export default function SpendSection() {
  const toast = useToastContext();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [cloud, setCloud] = useState<"aws" | "gcp" | "all">("all");
  const [team, setTeam] = useState<string>("all");
  const [env, setEnv] = useState<string>("all");
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("range", range);
      if (cloud !== "all") params.set("cloud", cloud);
      if (team !== "all") params.set("team", team);
      if (env !== "all") params.set("env", env);
      const res = await fetch(`/api/spend?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiPayload;
      setData(json);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error("Failed to load spend data");
      toast.error(error.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, cloud, team, env]);

  // ----- derived data (safe coercions) -----
  const daily = useMemo(
    () =>
      (data?.daily || []).map(d => ({
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cost: Number(d._sum?.cost_usd ?? 0),
      })),
    [data]
  );

  const byService = useMemo(
    () =>
      (data?.topServices || []).map(s => ({
        service: s.service.length > 20 ? s.service.substring(0, 20) + "..." : s.service,
        cost: Number(s._sum?.cost_usd ?? 0),
        fullService: s.service,
      })),
    [data]
  );

  const total = daily.reduce((acc, d) => acc + d.cost, 0);
  const avg = daily.length ? total / daily.length : 0;
  const topService = byService[0]?.fullService || "—";

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* header + filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <MoneyIcon className="w-6 h-6 text-blue-500" />
            Spend Overview
          </h2>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">
            Track your total cloud spend, daily trends, and top services across providers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-300 font-semibold">Range:</span>
            <select
              aria-label="Select date range"
              className="border border-gray-700 rounded-lg px-3 py-2 text-sm text-white bg-gray-800/50 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer font-medium"
              value={range}
              onChange={e => setRange(e.target.value as "7" | "30" | "90")}
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-300 font-semibold">Cloud:</span>
            <select
              aria-label="Select cloud provider"
              className="border border-gray-700 rounded-lg px-3 py-2 text-sm text-white bg-gray-800/50 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer font-medium"
              value={cloud}
              onChange={e => setCloud(e.target.value as "aws" | "gcp" | "all")}
            >
              <option value="all">All</option>
              <option value="aws">AWS</option>
              <option value="gcp">GCP</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-300 font-semibold">Team:</span>
            <select
              aria-label="Select team"
              className="border border-gray-700 rounded-lg px-3 py-2 text-sm min-w-[120px] text-white bg-gray-800/50 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer font-medium"
              value={team}
              onChange={e => setTeam(e.target.value)}
            >
              <option value="all">All</option>
              {data?.availableTeams?.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-300 font-semibold">Env:</span>
            <select
              aria-label="Select environment"
              className="border border-gray-700 rounded-lg px-3 py-2 text-sm min-w-[100px] text-white bg-gray-800/50 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer font-medium"
              value={env}
              onChange={e => setEnv(e.target.value)}
            >
              <option value="all">All</option>
              {data?.availableEnvs?.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </label>

          <button
            onClick={load}
            disabled={loading}
            aria-label={loading ? "Refreshing data..." : "Refresh data"}
            aria-busy={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-sm flex items-center gap-2"
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <KPI
          label="Total Spend (USD)"
          value={`$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={MoneyIcon}
          trend={daily.length > 1 ? (daily[daily.length - 1].cost > daily[0].cost ? "up" : "down") : undefined}
        />
        <KPI
          label="Average Daily Spend"
          value={`$${avg.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={ChartIcon}
        />
        <KPI 
          label="Top Service by Spend" 
          value={topService} 
          icon={TrophyIcon}
        />
      </div>

      {/* charts */}
      {loading && !data ? (
        <div className="grid md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            title="Daily Spend Trend" 
            icon={LineChartIcon}
            className="animate-in fade-in slide-in-from-left duration-500"
          >
            <div className="w-full h-80">
              {daily.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: 8,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
                        color: "#f3f4f6",
                        padding: "12px 16px",
                      }}
                      cursor={{ fill: "rgba(37, 99, 235, 0.1)" }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Cost"]}
                      labelStyle={{ color: "#9ca3af", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}
                      itemStyle={{ color: "#ffffff", fontSize: "13px", fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#2563eb" }}
                      activeDot={{ r: 6, fill: "#1d4ed8" }}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </div>
          </Card>

          <Card 
            title="Top 5 Services" 
            icon={FlameIcon}
            className="animate-in fade-in slide-in-from-right duration-500"
          >
            <div className="w-full h-80">
              {byService.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byService} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                      dataKey="service"
                      tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 500 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#4b5563"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 500 }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                      stroke="#4b5563"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: 8,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
                        color: "#f3f4f6",
                        padding: "12px 16px",
                      }}
                      cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                      formatter={(value: any, name: any, props: any) => [
                        `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        props?.payload?.fullService || name,
                      ]}
                      labelStyle={{ color: "#9ca3af", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}
                      itemStyle={{ color: "#ffffff", fontSize: "13px", fontWeight: 600 }}
                    />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <Bar
                      dataKey="cost"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                      animationBegin={0}
                      fill="url(#barGradient)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  icon: IconComponent,
  trend,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
}) {
  return (
    <div className="p-6 rounded-xl border border-gray-700/50 bg-gray-800/50 shadow-md hover:shadow-lg hover:border-gray-600/50 transition-all duration-200 group cursor-default">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
        {IconComponent && (
          <IconComponent className="w-6 h-6 text-gray-500 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-200" />
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-2 tracking-tight">{value}</p>
      {trend && (
        <div className={`mt-3 text-xs flex items-center gap-1.5 font-semibold ${trend === "up" ? "text-red-400" : "text-green-400"}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {trend === "up" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17l5-5m0 0l-5-5m5 5H6" />
            )}
          </svg>
          <span>{trend === "up" ? "Increasing" : "Decreasing"}</span>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  icon: IconComponent,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-6 rounded-xl border border-gray-700/50 bg-gray-800/50 shadow-md hover:shadow-lg transition-all duration-200 ${className}`}>
      <h3 className="font-bold mb-5 text-lg text-white tracking-tight flex items-center gap-2">
        {IconComponent && <IconComponent className="w-5 h-5 text-blue-500" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <ChartIcon className="w-12 h-12 mb-3 text-gray-600" />
      <p className="text-sm font-medium">No data for selected filters.</p>
    </div>
  );
}

