"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  PieChart,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_SUMMARY,
  DEMO_RECORDS,
  DEMO_RECEIVABLES,
  DEMO_PAYABLES,
  DEMO_FORECAST_POINTS,
} from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";

const expenseCategoryData = [
  { name: "Raw Materials", value: 92000, color: "#2563eb" },
  { name: "Payroll & Wages", value: 210000, color: "#4f46e5" },
  { name: "Facility & Utilities", value: 28500, color: "#06b6d4" },
  { name: "Maintenance & Tooling", value: 18400, color: "#f59e0b" },
];

const inflowCategoryData = [
  { name: "Client Milestones", value: 175000, color: "#10b981" },
  { name: "Product Dispatches", value: 145000, color: "#34d399" },
  { name: "Job Work Precision", value: 64000, color: "#059669" },
];

export default function ReportsPage() {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const triggerNotice = (msg: string) => {
    setDownloadNotice(msg);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  const exportForecastCSV = () => {
    const headers = "Date,DayOffset,OpeningCash,Inflow,Outflow,NetCashFlow,ClosingCash,ReserveStatus\n";
    const rows = DEMO_FORECAST_POINTS.map(
      (p) =>
        `"${p.date}",${p.dayOffset},${p.openingCash},${p.projectedInflow},${p.projectedOutflow},${p.netCashFlow},${p.closingCash},"${p.status}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coincise-cashflow-forecast-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    triggerNotice("Successfully generated and downloaded Cash-Flow Forecast CSV!");
  };

  const exportLedgerCSV = () => {
    const headers = "ID,Date,Type,Category,Description,Amount,Status,Ref\n";
    const rows = DEMO_RECORDS.map(
      (r) =>
        `"${r.id}","${r.date}","${r.type}","${r.category}","${r.description}",${r.amount},"${r.status}","${r.reference || ""}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coincise-transactions-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    triggerNotice("Successfully generated and downloaded Financial Ledger CSV!");
  };

  return (
    <div className="space-y-6">
      {/* Download Alert Notification */}
      {downloadNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{downloadNotice}</span>
          </div>
          <button onClick={() => setDownloadNotice(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header & Export Controls */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              EXECUTIVE REPORTING
            </span>
            <span className="text-xs text-slate-500">Audit-Ready Working Capital Analytics</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Financial Health & Liquidity Statements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Summaries of historical cash velocity, expense distributions, and exportable data sets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportLedgerCSV}>
            <Download className="w-4 h-4 mr-1.5" />
            Export Ledger CSV
          </Button>
          <Button variant="primary" size="sm" onClick={exportForecastCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Export Forecast CSV
          </Button>
        </div>
      </div>

      {/* Working Capital Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Days Sales Outstanding (DSO)</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">42 Days</h3>
          <p className="text-xs text-amber-600 mt-0.5">Avg collection lag (Target: &lt;30d)</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Days Payable Outstanding (DPO)</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">28 Days</h3>
          <p className="text-xs text-slate-500 mt-0.5">Supplier settlement pacing</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Cash Generation (Monthly)</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">
            +{formatCurrency(170000)}
          </h3>
          <p className="text-xs text-emerald-600 mt-0.5">Positive net liquidity accretion</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Current Reserve Ratio</p>
          <h3 className="text-2xl font-bold text-blue-600 mt-1">1.94x</h3>
          <p className="text-xs text-slate-500 mt-0.5">Available Cash / Min Safety Floor</p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outflow Category Breakdown */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Expenditure Breakdown by Cost Center</CardTitle>
              <CardDescription>
                Cleared operational disbursements in the current cycle
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenseCategoryData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "#334155" }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val), "Amount"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Inflow Category Breakdown */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Revenue & Receipt Sources</CardTitle>
              <CardDescription>
                Cleared cash inflows categorized by commercial activity
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={inflowCategoryData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "#334155" }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val), "Amount"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Horizon Comparative Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Multi-Horizon Cash Forecast Summary</CardTitle>
              <CardDescription>
                Comparison of net cash generated and liquidity floor across 7, 30, 60 & 90 days
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportForecastCSV}>
              <Download className="w-4 h-4 mr-1.5" />
              Download Dataset
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Horizon Window</th>
                <th className="py-3 px-4 text-right">Projected Inflows</th>
                <th className="py-3 px-4 text-right">Projected Outflows</th>
                <th className="py-3 px-4 text-right">Net Flow</th>
                <th className="py-3 px-4 text-right">Projected Closing Balance</th>
                <th className="py-3 px-5 text-center">Safety Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="py-3.5 px-5 font-bold text-slate-900">7-Day Snapshot</td>
                <td className="py-3.5 px-4 text-right font-medium text-emerald-600">+₹7,20,000</td>
                <td className="py-3.5 px-4 text-right font-medium text-rose-600">-₹6,30,000</td>
                <td className="py-3.5 px-4 text-right font-bold text-emerald-600">+₹90,000</td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹5,75,000</td>
                <td className="py-3.5 px-5 text-center">
                  <Badge variant="success" size="sm">
                    ✓ Strong Liquidity
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 bg-amber-50/20">
                <td className="py-3.5 px-5 font-bold text-slate-900">30-Day Outlook</td>
                <td className="py-3.5 px-4 text-right font-medium text-emerald-600">+₹8,20,000</td>
                <td className="py-3.5 px-4 text-right font-medium text-rose-600">-₹6,50,000</td>
                <td className="py-3.5 px-4 text-right font-bold text-emerald-600">+₹1,70,000</td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹6,55,000</td>
                <td className="py-3.5 px-5 text-center">
                  <Badge variant="warning" size="sm">
                    ⚠️ Day 22 Reserve Dip
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3.5 px-5 font-bold text-slate-900">60-Day Runway</td>
                <td className="py-3.5 px-4 text-right font-medium text-emerald-600">+₹14,30,000</td>
                <td className="py-3.5 px-4 text-right font-medium text-rose-600">-₹15,50,000</td>
                <td className="py-3.5 px-4 text-right font-bold text-rose-600">-₹1,20,000</td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹3,65,000</td>
                <td className="py-3.5 px-5 text-center">
                  <Badge variant="success" size="sm">
                    ✓ Above Floor
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3.5 px-5 font-bold text-slate-900">90-Day Outlook</td>
                <td className="py-3.5 px-4 text-right font-medium text-emerald-600">+₹20,10,000</td>
                <td className="py-3.5 px-4 text-right font-medium text-rose-600">-₹20,30,000</td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-600">-₹20,000</td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹4,65,000</td>
                <td className="py-3.5 px-5 text-center">
                  <Badge variant="success" size="sm">
                    ✓ Stable Runway
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
