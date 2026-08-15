/**
 * DealPipeline — Visual pipeline showing leads by stage with drag-drop support.
 */

import { useCallback, useState } from 'react';
import { usePipeline } from '../../../hooks/useAnalytics';
import { LEAD_STAGE_LABELS, type LeadStage } from '../services/analyticsService';
import { supabase } from '../services/supabase';
import { formatCurrency } from '../../../lib/format';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface PipelineStage {
  stage: LeadStage;
  label: string;
  count: number;
  totalValue: number;
  paidValue: number;
}

interface DragItem {
  leadId: string;
  fromStage: LeadStage;
}

// ═══════════════════════════════════════════════════════════
// STAGE COLORS
// ═══════════════════════════════════════════════════════════

const STAGE_COLORS: Record<LeadStage, string> = {
  enquiry: 'bg-blue-100 border-blue-300',
  qualified: 'bg-yellow-100 border-yellow-300',
  invoiced: 'bg-purple-100 border-purple-300',
  handed_off: 'bg-green-100 border-green-300',
};

const STAGE_HEADER_COLORS: Record<LeadStage, string> = {
  enquiry: 'bg-blue-200',
  qualified: 'bg-yellow-200',
  invoiced: 'bg-purple-200',
  handed_off: 'bg-green-200',
};

// ═══════════════════════════════════════════════════════════
// LEAD CARD COMPONENT
// ═══════════════════════════════════════════════════════════

interface LeadCardProps {
  leadId: string;
  name: string;
  email?: string;
  value?: number;
  onDragStart: (item: DragItem) => void;
}

function LeadCard({ leadId, name, email, value, onDragStart }: LeadCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', leadId);
    onDragStart({ leadId, fromStage: 'enquiry' }); // Will be overridden by parent
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="font-medium text-sm">{name}</div>
      {email && <div className="text-xs text-gray-500 truncate">{email}</div>}
      {value !== undefined && value > 0 && (
        <div className="text-xs text-green-600 mt-1">{formatCurrency(value)}</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIPELINE STAGE COLUMN COMPONENT
// ═══════════════════════════════════════════════════════════

interface PipelineStageColumnProps {
  stage: PipelineStage;
  onDrop: (leadId: string, toStage: LeadStage) => void;
  onDragStart: (item: DragItem) => void;
}

function PipelineStageColumn({ stage, onDrop, onDragStart }: PipelineStageColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const leadId = e.dataTransfer.getData('leadId');
      if (leadId) {
        onDrop(leadId, stage.stage);
      }
    },
    [onDrop, stage.stage]
  );

  return (
    <div
      className={`flex flex-col ${STAGE_COLORS[stage.stage]} border-2 rounded-lg transition-colors ${
        isDragOver ? 'border-blue-500 bg-blue-50' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Stage Header */}
      <div className={`p-3 rounded-t ${STAGE_HEADER_COLORS[stage.stage]}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{stage.label}</h3>
          <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium">
            {stage.count}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {formatCurrency(stage.totalValue)}
        </div>
      </div>

      {/* Leads List */}
      <div className="p-2 flex-1 min-h-[100px]">
        {/* Placeholder for empty state */}
        {stage.count === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DEAL PIPELINE COMPONENT
// ═══════════════════════════════════════════════════════════

interface DealPipelineProps {
  tenantId: string;
}

export default function DealPipeline({ tenantId }: DealPipelineProps) {
  const { pipeline, loading, error, refresh } = usePipeline(tenantId);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);

  const handleDragStart = useCallback((item: DragItem) => {
    setDragItem(item);
  }, []);

  const handleDrop = useCallback(
    async (leadId: string, toStage: LeadStage) => {
      // Update lead status in database
      const { error: updateError } = await supabase
        .from('front_desk.leads')
        .update({ status: toStage, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (updateError) {
        console.error('Failed to update lead stage:', updateError);
        return;
      }

      // Record conversion event
      if (dragItem && dragItem.fromStage !== toStage) {
        await supabase.from('office_desk.conversion_events').insert({
          tenant_id: tenantId,
          lead_id: leadId,
          conversion_type: 'lead_convert',
          source_status: dragItem.fromStage,
          target_status: toStage,
        });
      }

      setDragItem(null);
      refresh();
    },
    [dragItem, tenantId, refresh]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pipeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

      const totalValue = pipeline.reduce((sum: number, s: PipelineStage) => sum + s.totalValue, 0);
      const totalLeads = pipeline.reduce((sum: number, s: PipelineStage) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Deal Pipeline</h2>
          <p className="text-sm text-gray-500">
            {totalLeads} leads • {formatCurrency(totalValue)} total value
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {pipeline.map((stage: PipelineStage) => (
          <PipelineStageColumn
            key={stage.stage}
            stage={stage}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
          />
        ))}
      </div>

      {/* Pipeline Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Pipeline Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pipeline.map((stage: PipelineStage) => (
            <div key={stage.stage} className="text-center">
              <div className="text-2xl font-bold">{stage.count}</div>
              <div className="text-sm text-gray-500">{stage.label}</div>
              <div className="text-xs text-green-600">
                {formatCurrency(stage.totalValue)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
