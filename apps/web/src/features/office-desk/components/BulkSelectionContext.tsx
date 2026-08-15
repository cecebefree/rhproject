import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type EntityType = 'lead' | 'contact' | 'invoice';

export interface BulkSelectionState {
  selectedIds: Set<string>;
  entityType: EntityType;
  totalCount: number;
  selectAll: boolean;
}

export interface BulkSelectionContextType {
  selectedIds: Set<string>;
  entityType: EntityType;
  tenantId: string;
  totalCount: number;
  selectAll: boolean;
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectAllOnPage: (ids: string[]) => void;
  deselectAll: () => void;
  setEntityType: (type: EntityType) => void;
  setTenantId: (id: string) => void;
  setTotalCount: (count: number) => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

const BulkSelectionContext = createContext<BulkSelectionContextType | null>(null);

export function BulkSelectionProvider({
  children,
  initialEntityType = 'lead',
  initialTenantId = '',
}: {
  children: React.ReactNode;
  initialEntityType?: EntityType;
  initialTenantId?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [entityType, setEntityType] = useState<EntityType>(initialEntityType);
  const [tenantId, setTenantId] = useState<string>(initialTenantId);
  const [totalCount, setTotalCount] = useState(0);
  const [selectAll, setSelectAll] = useState(false);

  const select = useCallback((id: string) => {
    setSelectedIds((prev) => new Set([...prev, id]));
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectAll(false);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setSelectAll(true);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const value = useMemo(
    () => ({
      selectedIds,
      entityType,
      tenantId,
      totalCount,
      selectAll,
      select,
      deselect,
      toggle,
      selectAllOnPage,
      deselectAll,
      setEntityType,
      setTenantId,
      setTotalCount,
      isSelected,
      selectedCount: selectedIds.size,
    }),
    [
      selectedIds,
      entityType,
      tenantId,
      totalCount,
      selectAll,
      select,
      deselect,
      toggle,
      selectAllOnPage,
      deselectAll,
      setEntityType,
      setTenantId,
      setTotalCount,
      isSelected,
    ]
  );

  return (
    <BulkSelectionContext.Provider value={value}>
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function useBulkSelection() {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error('useBulkSelection must be used within a BulkSelectionProvider');
  }
  return context;
}

export { BulkSelectionContext };