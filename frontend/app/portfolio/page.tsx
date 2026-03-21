"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import AllocationChart from "@/components/portfolio/AllocationChart";
import PositionsTable from "@/components/portfolio/PositionsTable";
import AddPositionForm from "@/components/portfolio/AddPositionForm";
import EditPositionModal from "@/components/portfolio/EditPositionModal";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePortfolioStats } from "@/hooks/usePortfolioStats";
import type { EnrichedPosition } from "@/hooks/usePortfolioStats";
import { Loader2, Plus } from "lucide-react";

export default function PortfolioPage() {
  const { add, edit, remove } = usePortfolio();
  const { positions, summary, isLoading } = usePortfolioStats();
  const [editing, setEditing] = useState<EnrichedPosition | null>(null);
  const [showForm, setShowForm] = useState(false);

  const hasPositions = positions.length > 0;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Portfolio</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Track your positions and performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />}
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: showForm ? "var(--bg-subtle)" : "var(--accent-green)",
                color: showForm ? "var(--text-secondary)" : "#080C14",
              }}
            >
              <Plus size={14} className={`transition-transform ${showForm ? "rotate-45" : ""}`} />
              {showForm ? "Close" : "Add Position"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Summary cards */}
          <PortfolioSummary summary={summary} />

          {/* Add form — collapsible */}
          {showForm && (
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <p
                className="text-[10px] font-medium tracking-widest uppercase mb-4"
                style={{ color: "var(--text-muted)" }}
              >
                New Position
              </p>
              <AddPositionForm
                onAdd={async (...args) => {
                  await add(...args);
                  setShowForm(false);
                }}
              />
            </div>
          )}

          {/* Chart + table */}
          {hasPositions && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <AllocationChart positions={positions} totalValue={summary.totalValue} />
              </div>
              <div className="lg:col-span-2">
                <PositionsTable
                  positions={positions}
                  onEdit={(p) => setEditing(p)}
                  onDelete={(id) => remove(id)}
                />
              </div>
            </div>
          )}

          {!hasPositions && !showForm && (
            <PositionsTable
              positions={[]}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )}
        </div>

        {editing && (
          <EditPositionModal
            position={editing}
            onSave={edit}
            onClose={() => setEditing(null)}
          />
        )}
      </main>
    </div>
  );
}
