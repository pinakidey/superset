/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';

import {
  NumberParam,
  StringParam,
  useQueryParams,
  QueryParamConfig,
} from 'use-query-params';

import rison from 'rison';
import { isEqual } from 'lodash-es';
import {
  ListViewFetchDataConfig as FetchDataConfig,
  ListViewFilter as Filter,
  ListViewFilterValue as FilterValue,
  InnerFilterValue,
  InternalFilter,
  SortColumn,
  ViewModeType,
} from './types';

// Define custom RisonParam for proper encoding/decoding; note that
// %, &, +, and # must be encoded to avoid breaking the url
const RisonParam: QueryParamConfig<string, string | undefined> = {
  encode: (data?: Record<string, unknown> | null) => {
    if (data === undefined || data === null) return undefined;

    const cleanData = JSON.parse(
      JSON.stringify(data, (key, value) =>
        value === undefined ? null : value,
      ),
    );

    return rison
      .encode(cleanData)
      .replace(/%/g, '%25')
      .replace(/&/g, '%26')
      .replace(/\+/g, '%2B')
      .replace(/#/g, '%23');
  },
  decode: (dataStr?: string | string[]) =>
    dataStr === undefined || Array.isArray(dataStr)
      ? undefined
      : rison.decode(dataStr),
};

export const SELECT_WIDTH = 176;
export const RANGE_WIDTH = 300;
export const WIDER_DROPDOWN_WIDTH = '300px';

export class ListViewError extends Error {
  name = 'ListViewError';
}

// removes element from a list, returns new list
export function removeFromList(list: unknown[], index: number): unknown[] {
  return list.filter((_, i) => index !== i);
}

// apply update to elements of object list, returns new list
function updateInList(
  list: Record<string, unknown>[],
  index: number,
  update: Record<string, unknown>,
): Record<string, unknown>[] {
  const element = list.find((_, i) => index === i);

  return [
    ...list.slice(0, index),
    { ...element, ...update },
    ...list.slice(index + 1),
  ];
}

type QueryFilterState = {
  [id: string]: FilterValue['value'];
};

function mergeCreateFilterValues(list: Filter[], updateObj: QueryFilterState) {
  return list.map(({ id, urlDisplay, operator }) => {
    const currentFilterId = urlDisplay || id;
    const update = updateObj[currentFilterId];

    return { id, urlDisplay, operator, value: update };
  });
}

// convert filters from UI objects to data objects
export function convertFilters(fts: InternalFilter[]): FilterValue[] {
  return fts
    .filter(
      f =>
        !(
          typeof f.value === 'undefined' ||
          (Array.isArray(f.value) && !f.value.length)
        ),
    )
    .flatMap(({ value, operator, id }) => {
      // handle between filter using 2 api filters
      if (operator === 'between' && Array.isArray(value)) {
        return [
          {
            value: value[0],
            operator: 'gt',
            id,
          },
          {
            value: value[1],
            operator: 'lt',
            id,
          },
        ];
      }
      return {
        value,
        operator,
        id,
      };
    });
}

// convertFilters but to handle new decoded rison format
export function convertFiltersRison(
  filterObj: Record<string, unknown>,
  list: Filter[],
): FilterValue[] {
  const filters: FilterValue[] = [];
  const refs: Record<string, FilterValue> = {};

  Object.keys(filterObj).forEach(id => {
    const filter: FilterValue = {
      id,
      value: filterObj[id],
    };

    refs[id] = filter;
    filters.push(filter);
  });

  // Add operators from filter list
  list.forEach(value => {
    const currentFilterId = value.urlDisplay || value.id;
    const filter = refs[currentFilterId];

    if (filter) {
      filter.operator = value.operator;
      filter.id = value.id;
    }
  });

  return filters;
}

export function extractInputValue(
  inputType: Filter['input'],
  event: { currentTarget: { value: string; checked: boolean } },
) {
  if (!inputType || inputType === 'text') {
    return event.currentTarget.value;
  }
  if (inputType === 'checkbox') {
    return event.currentTarget.checked;
  }

  return null;
}

interface UseListViewConfig {
  fetchData: (conf: FetchDataConfig) => unknown;
  columns: ColumnDef<Record<string, unknown>, unknown>[];
  data: Record<string, unknown>[];
  count: number;
  initialPageSize: number;
  initialSort?: SortColumn[];
  initialFilters?: Filter[];
  renderCard?: boolean;
  defaultViewMode?: ViewModeType;
}

export function useListViewState({
  fetchData,
  columns,
  data,
  count,
  initialPageSize,
  initialFilters = [],
  initialSort = [],
  renderCard = false,
  defaultViewMode = 'card',
}: UseListViewConfig) {
  const [query, setQuery] = useQueryParams({
    filters: RisonParam,
    pageIndex: NumberParam,
    sortColumn: StringParam,
    sortOrder: StringParam,
    viewMode: StringParam,
  });

  const initialSortBy = useMemo(
    () =>
      query.sortColumn && query.sortOrder
        ? [{ id: query.sortColumn, desc: query.sortOrder === 'desc' }]
        : initialSort,
    [initialSort, query.sortColumn, query.sortOrder],
  );

  const initialFiltersState: ColumnFiltersState = query.filters
    ? convertFiltersRison(
        query.filters as Record<string, unknown>,
        initialFilters,
      ).map(f => ({
        id: f.id,
        value: f.value,
      }))
    : [];

  const [viewMode, setViewMode] = useState<ViewModeType>(
    (query.viewMode as ViewModeType) ||
      (renderCard ? defaultViewMode : 'table'),
  );

  const columnsWithFilter = useMemo(
    () => columns.map(f => ({ ...f, filterFn: 'equals' as const })),
    [columns],
  );

  const [sorting, setSorting] = useState<SortingState>(initialSortBy);
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(initialFiltersState);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: (query.pageIndex as number) || 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    columns: columnsWithFilter,
    data,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: false,
    pageCount: Math.ceil(count / initialPageSize),
    enableRowSelection: true,
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const canPreviousPage = table.getCanPreviousPage();
  const canNextPage = table.getCanNextPage();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const sortBy = table.getState().sorting;
  const filters = table.getState().columnFilters;
  const selectedFlatRows = table.getSelectedRowModel().rows;

  const [internalFilters, setInternalFilters] = useState<InternalFilter[]>(
    query.filters && initialFilters.length
      ? mergeCreateFilterValues(
          initialFilters,
          query.filters as QueryFilterState,
        )
      : [],
  );

  useEffect(() => {
    if (initialFilters.length) {
      setInternalFilters(
        mergeCreateFilterValues(
          initialFilters,
          query.filters ? (query.filters as QueryFilterState) : {},
        ),
      );
    }
  }, [initialFilters]);

  useEffect(() => {
    const filterObj: Record<string, InnerFilterValue> = {};

    internalFilters.forEach(filter => {
      if (
        filter.value !== undefined &&
        (typeof filter.value !== 'string' || filter.value.length > 0)
      ) {
        const currentFilterId = filter.urlDisplay || filter.id;
        filterObj[currentFilterId] = filter.value;
      }
    });

    const queryParams: Record<string, unknown> = {
      filters: Object.keys(filterObj).length ? filterObj : undefined,
      pageIndex,
    };
    if (sortBy?.[0]?.id !== undefined && sortBy[0].id !== null) {
      queryParams.sortColumn = sortBy[0].id;
      queryParams.sortOrder = sortBy[0].desc ? 'desc' : 'asc';
    }

    if (renderCard) {
      queryParams.viewMode = viewMode;
    }

    const method =
      typeof query.pageIndex !== 'undefined' &&
      queryParams.pageIndex !== query.pageIndex
        ? 'push'
        : 'replace';

    setQuery(queryParams, method);

    // Convert v8 column filters to the format fetchData expects
    const filtersForFetch = filters.map(f => ({
      id: f.id,
      value: f.value,
    }));
    fetchData({ pageIndex, pageSize, sortBy, filters: filtersForFetch });
  }, [fetchData, pageIndex, pageSize, sortBy, filters]);

  useEffect(() => {
    const initialPageIdx = (query.pageIndex as number) || 0;
    if (!isEqual(initialPageIdx, pageIndex)) {
      table.setPageIndex(initialPageIdx);
    }
  }, [query]);

  const gotoPage = (page: number) => {
    table.setPageIndex(page);
  };

  const setAllFilters = (newFilters: FilterValue[]) => {
    setColumnFilters(newFilters.map(f => ({ id: f.id, value: f.value })));
  };

  const setSortBy = (newSortBy: SortingState) => {
    setSorting(newSortBy);
  };

  const toggleAllRowsSelected = (value?: boolean) => {
    table.toggleAllRowsSelected(value);
  };

  const prepareRow = () => {
    // v8 doesn't need prepareRow - it's a no-op for backward compatibility
  };

  const applyFilterValue = (index: number, value: unknown) => {
    setInternalFilters(currentInternalFilters => {
      if (currentInternalFilters[index].value === value) {
        return currentInternalFilters;
      }

      const update = { ...currentInternalFilters[index], value };
      const updatedFilters = updateInList(
        currentInternalFilters as Record<string, unknown>[],
        index,
        update as Record<string, unknown>,
      ) as InternalFilter[];

      setAllFilters(convertFilters(updatedFilters));
      gotoPage(0);
      return updatedFilters;
    });
  };

  return {
    canNextPage,
    canPreviousPage,
    getTableBodyProps: () => ({}),
    getTableProps: () => ({}),
    gotoPage,
    headerGroups,
    pageCount,
    prepareRow,
    rows,
    selectedFlatRows,
    setAllFilters,
    setSortBy,
    state: { pageIndex, pageSize, sortBy, filters, internalFilters, viewMode },
    toggleAllRowsSelected,
    applyFilterValue,
    setViewMode,
    query,
  };
}
