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
/* eslint-disable import/no-extraneous-dependencies */
import {
  useCallback,
  useRef,
  ReactNode,
  HTMLProps,
  MutableRefObject,
  CSSProperties,
  DragEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { typedMemo, usePrevious } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnOrderState,
  type Row,
  type FilterFn,
  type Table,
} from '@tanstack/react-table';
import { matchSorter, rankings } from 'match-sorter';
import { isEqual } from 'lodash-es';
import { Flex, Space } from '@superset-ui/core/components';
import GlobalFilter, { GlobalFilterProps } from './components/GlobalFilter';
import SelectPageSize, {
  SelectPageSizeProps,
  SizeOption,
} from './components/SelectPageSize';
import SimplePagination from './components/Pagination';
import useSticky from './hooks/useSticky';
import { PAGE_SIZE_OPTIONS } from '../consts';
import { sortAlphanumericCaseInsensitive } from './utils/sortAlphanumericCaseInsensitive';
import { SearchOption, SortByItem } from '../types';
import SearchSelectDropdown from './components/SearchSelectDropdown';
import type { GetTableSize } from './hooks/useSticky';

export interface DataTableProps<D extends object> {
  columns: ColumnDef<D, unknown>[];
  data: D[];
  tableClassName?: string;
  searchInput?: boolean | GlobalFilterProps<D>['searchInput'];
  selectPageSize?: boolean | SelectPageSizeProps['selectRenderer'];
  pageSizeOptions?: SizeOption[];
  maxPageItemCount?: number;
  width?: string | number;
  height?: string | number;
  serverPagination?: boolean;
  onServerPaginationChange: (pageNumber: number, pageSize: number) => void;
  serverPaginationData: {
    pageSize?: number;
    currentPage?: number;
    sortBy?: SortByItem[];
    searchColumn?: string;
  };
  pageSize?: number;
  noResults?: string | ((filterString: string) => ReactNode);
  sticky?: boolean;
  rowCount: number;
  wrapperRef?: MutableRefObject<HTMLDivElement>;
  onColumnOrderChange?: () => void;
  renderGroupingHeaders?: () => JSX.Element;
  renderTimeComparisonDropdown?: () => JSX.Element;
  handleSortByChange: (sortBy: SortByItem[]) => void;
  sortByFromParent: SortByItem[];
  manualSearch?: boolean;
  onSearchChange?: (searchText: string) => void;
  initialSearchText?: string;
  searchInputId?: string;
  onSearchColChange: (searchCol: string) => void;
  searchOptions: SearchOption[];
  onFilteredDataChange?: (rows: Row<D>[], filterValue?: string) => void;
  onFilteredRowsChange?: (rows: D[]) => void;
  initialState?: Record<string, unknown>;
  getTableSize?: GetTableSize;
  globalFilter?: FilterFn<D>;
}

export interface RenderHTMLCellProps extends HTMLProps<HTMLTableCellElement> {
  cellContent: ReactNode;
}

// Be sure to pass our updateMyData and the skipReset option
export default typedMemo(function DataTable<D extends object>({
  tableClassName,
  columns,
  data,
  serverPaginationData,
  width: initialWidth = '100%',
  height: initialHeight = 300,
  pageSize: initialPageSize = 0,
  initialState: initialState_ = {},
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  maxPageItemCount = 9,
  sticky: doSticky,
  searchInput = true,
  onServerPaginationChange,
  rowCount,
  selectPageSize,
  noResults: noResultsText = 'No data found',
  serverPagination,
  wrapperRef: userWrapperRef,
  onColumnOrderChange,
  renderGroupingHeaders,
  renderTimeComparisonDropdown,
  handleSortByChange,
  sortByFromParent = [],
  manualSearch = false,
  onSearchChange,
  initialSearchText,
  searchInputId,
  onSearchColChange,
  searchOptions,
  onFilteredDataChange,
  onFilteredRowsChange,
  getTableSize: getTableSizeProp,
  ...moreUseTableOptions
}: DataTableProps<D>): JSX.Element {
  const columnNames = columns.map((column, index) => {
    const colId =
      column.id ||
      ('accessorKey' in column ? String(column.accessorKey) : undefined) ||
      String(index);
    return colId;
  });
  const previousColumnNames = usePrevious(columnNames);
  const resultsSize = serverPagination ? rowCount : data.length;
  const sortByRef = useRef<SortingState>([]);
  const pageSizeRef = useRef([initialPageSize, resultsSize]);
  const hasPagination = initialPageSize > 0 && resultsSize > 0;
  const hasGlobalControl =
    hasPagination || !!searchInput || renderTimeComparisonDropdown;
  const defaultWrapperRef = useRef<HTMLDivElement>(null);
  const globalControlRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const wrapperRef = userWrapperRef || defaultWrapperRef;
  const paginationData = JSON.stringify(serverPaginationData);

  const [sorting, setSorting] = useState<SortingState>(
    serverPagination
      ? sortByFromParent.map(s => ({ id: s.id, desc: s.desc }))
      : sortByRef.current,
  );
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    columnNames,
  );
  const effectivePageSize =
    initialPageSize > 0 ? initialPageSize : resultsSize || 10;

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: effectivePageSize,
  });

  const defaultGetTableSize = useCallback(() => {
    if (wrapperRef.current) {
      const width = Number(initialWidth) || wrapperRef.current.clientWidth;
      const height =
        (Number(initialHeight) || wrapperRef.current.clientHeight) -
        (globalControlRef.current?.clientHeight || 0) -
        (paginationRef.current?.clientHeight || 0);
      return { width, height };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialHeight,
    initialWidth,
    wrapperRef,
    hasPagination,
    hasGlobalControl,
    paginationRef,
    resultsSize,
    paginationData,
  ]);

  const defaultGlobalFilter: FilterFn<D> = useCallback(
    (row: Row<D>, columnId: string, filterValue: string) => {
      const allColumnIds = columns.map(
        (c, i) =>
          c.id ||
          ('accessorKey' in c ? String(c.accessorKey) : undefined) ||
          String(i),
      );
      const joinedString = allColumnIds
        .map(id => row.getValue(id))
        .join(' ');
      const matched = matchSorter([joinedString], filterValue, {
        threshold: rankings.ACRONYM,
      });
      return matched.length > 0;
    },
    [columns],
  );

  const autoResetGlobalFilter = !isEqual(columnNames, previousColumnNames);

  const table: Table<D> = useReactTable<D>({
    columns,
    data,
    state: {
      sorting,
      globalFilter,
      columnOrder,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: serverPagination ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (moreUseTableOptions as Record<string, unknown>).globalFilter as FilterFn<D> | undefined || defaultGlobalFilter,
    manualSorting: !!serverPagination,
    enableSortingRemoval: false,
    autoResetPageIndex: autoResetGlobalFilter,
    sortingFns: {
      alphanumeric: (rowA, rowB, columnId) =>
        sortAlphanumericCaseInsensitive(rowA, rowB, columnId),
    },
  });

  const allColumns = table.getAllColumns();
  const headerGroups = table.getHeaderGroups();
  const footerGroups = table.getFooterGroups();
  const sortedRows = table.getSortedRowModel().rows;
  const page = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const currentPageSize = table.getState().pagination.pageSize;
  const filterValue = table.getState().globalFilter;
  const sortBy = table.getState().sorting;
  const preGlobalFilteredRows = table.getPreFilteredRowModel().rows;

  const stickyHook = useSticky({
    data,
    page,
    rows: sortedRows,
    allColumnIds: allColumns.map(c => c.id),
    getTableSize: getTableSizeProp || defaultGetTableSize,
  });
  const { wrapStickyTable, sticky } = doSticky
    ? stickyHook
    : { wrapStickyTable: undefined, sticky: {} as Record<string, unknown> };

  const rowSignature = useMemo(
    () =>
      sortedRows
        .map((row, index) => row.id ?? index)
        .sort()
        .join('|'),
    [sortedRows],
  );

  const rowsRef = useRef(sortedRows);
  rowsRef.current = sortedRows;

  useEffect(() => {
    if (!onFilteredDataChange) {
      return;
    }

    const searchText =
      typeof filterValue === 'string' ? filterValue : undefined;

    onFilteredDataChange(rowsRef.current, searchText);
  }, [filterValue, onFilteredDataChange, rowSignature]);

  const handleSearchChange = useCallback(
    (query: string) => {
      if (manualSearch && onSearchChange) {
        onSearchChange(query);
      } else {
        setGlobalFilter(query);
      }
    },
    [manualSearch, onSearchChange],
  );

  // updating the sort by to the own State of table viz
  useEffect(() => {
    const serverSortBy = serverPaginationData?.sortBy || [];

    if (serverPagination && !isEqual(sortBy, serverSortBy)) {
      if (Array.isArray(sortBy) && sortBy.length > 0) {
        const [sortByItem] = sortBy;
        const matchingColumn = columns.find(col => col?.id === sortByItem?.id);

        if (matchingColumn && 'columnKey' in (matchingColumn as Record<string, unknown>)) {
          const sortByWithColumnKey: SortByItem = {
            ...sortByItem,
            key: (matchingColumn as Record<string, unknown>).columnKey as string,
          };

          handleSortByChange([sortByWithColumnKey]);
        }
      } else {
        handleSortByChange([]);
      }
    }
  }, [sortBy]);

  // make setPageSize accept 0
  const setPageSize = (size: number) => {
    if (serverPagination) {
      onServerPaginationChange(0, size);
    }
    if (size || resultsSize !== 0) {
      table.setPageSize(size === 0 ? resultsSize : size);
    }
  };

  const gotoPage = (pageNum: number) => {
    table.setPageIndex(pageNum);
  };

  const noResults =
    typeof noResultsText === 'function'
      ? noResultsText(filterValue as string)
      : noResultsText;

  const getNoResults = () => <div className="dt-no-results">{noResults}</div>;

  if (!columns || columns.length === 0) {
    return (
      wrapStickyTable ? wrapStickyTable(getNoResults) : getNoResults()
    ) as JSX.Element;
  }

  const shouldRenderFooter = columns.some(x => !!x.footer);

  let columnBeingDragged = -1;

  const onDragStart = (e: DragEvent) => {
    const el = e.target as HTMLTableCellElement;
    columnBeingDragged = allColumns.findIndex(
      col => col.id === el.dataset.columnName,
    );
    e.dataTransfer.setData('text/plain', `${columnBeingDragged}`);
  };

  const onDrop = (e: DragEvent) => {
    const el = e.target as HTMLTableCellElement;
    const newPosition = allColumns.findIndex(
      col => col.id === el.dataset.columnName,
    );

    if (newPosition !== -1) {
      const currentCols = allColumns.map(c => c.id);
      const colToBeMoved = currentCols.splice(columnBeingDragged, 1);
      currentCols.splice(newPosition, 0, colToBeMoved[0]);
      setColumnOrder(currentCols);
      onColumnOrderChange?.();
    }
    e.preventDefault();
  };

  const renderTable = () => (
    <table className={tableClassName}>
      <thead>
        {renderGroupingHeaders ? renderGroupingHeaders() : null}
        {headerGroups.map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => {
              if (header.isPlaceholder) return null;
              const headerDef = header.column.columnDef.header;
              if (typeof headerDef === 'function') {
                return flexRender(headerDef, {
                  ...header.getContext(),
                  key: header.id,
                  onClick: header.column.getToggleSortingHandler(),
                  onDragStart,
                  onDrop,
                });
              }
              return (
                <th
                  key={header.id}
                  data-column-name={header.column.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                >
                  {headerDef}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {page && page.length > 0 ? (
          page.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => {
                const cellDef = cell.column.columnDef.cell;
                if (typeof cellDef === 'function') {
                  return flexRender(cellDef, {
                    ...cell.getContext(),
                    key: cell.id,
                  });
                }
                return <td key={cell.id}>{flexRender(cellDef, cell.getContext())}</td>;
              })}
            </tr>
          ))
        ) : (
          <tr>
            <td className="dt-no-results" colSpan={columns.length}>
              {noResults}
            </td>
          </tr>
        )}
      </tbody>
      {shouldRenderFooter && (
        <tfoot>
          {footerGroups.map(footerGroup => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map(header => {
                if (header.isPlaceholder) return null;
                const footerDef = header.column.columnDef.footer;
                if (typeof footerDef === 'function') {
                  return flexRender(footerDef, {
                    ...header.getContext(),
                    key: header.id,
                  });
                }
                return <td key={header.id}>{footerDef}</td>;
              })}
            </tr>
          ))}
        </tfoot>
      )}
    </table>
  );

  // force update the pageSize when it's been update from the initial state
  if (
    pageSizeRef.current[0] !== initialPageSize ||
    (initialPageSize === 0 && pageSizeRef.current[1] !== resultsSize)
  ) {
    pageSizeRef.current = [initialPageSize, resultsSize];
    setPageSize(initialPageSize);
  }

  const paginationStyle: CSSProperties = (sticky as Record<string, unknown>).height
    ? {}
    : { visibility: 'hidden' };

  let resultPageCount = pageCount;
  let resultCurrentPageSize = currentPageSize;
  let resultCurrentPage = pageIndex;
  let resultOnPageChange: (page: number) => void = gotoPage;
  if (serverPagination) {
    const serverPageSize = serverPaginationData?.pageSize ?? initialPageSize;
    resultPageCount = Math.ceil(rowCount / serverPageSize);
    if (!Number.isFinite(resultPageCount)) {
      resultPageCount = 0;
    }
    resultCurrentPageSize = serverPageSize;
    const foundPageSizeIndex = pageSizeOptions.findIndex(
      ([option]) => option >= resultCurrentPageSize,
    );
    if (foundPageSizeIndex === -1) {
      resultCurrentPageSize = 0;
    }
    resultCurrentPage = serverPaginationData?.currentPage ?? 0;
    resultOnPageChange = (pageNumber: number) =>
      onServerPaginationChange(pageNumber, serverPageSize);
  }

  // Emit filtered rows to parent in client-side mode (debounced via RAF)
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const rafRef = useRef<number | null>(null);
  const lastSigRef = useRef<string>('');

  function stableRowKey<R extends object>(r: Row<R>): string {
    const orig = r.original as Record<string, unknown> | undefined;
    if (orig) {
      const idLike =
        (orig as Record<string, unknown>).id ??
        (orig as Record<string, unknown>).ID ??
        (orig as Record<string, unknown>).key ??
        (orig as Record<string, unknown>).uuid;
      if (idLike != null) return String(idLike);
    }

    const cells = r.getAllCells();
    const keys = cells.map(c => c.column.id).sort();
    return keys.map(k => String(r.getValue(k) ?? '')).join('|');
  }

  function hashString(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) {
      // oxlint-disable-next-line unicorn/prefer-math-trunc -- | 0 is intentional for 32-bit integer wrapping in hash
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  function signatureOfRows<R extends object>(rs: Row<R>[]): string {
    const keys = rs.map(stableRowKey);
    const len = keys.length;
    const first = keys[0] ?? '';
    const last = keys[len - 1] ?? '';
    const digest = hashString(keys.join('\u0001'));
    return `${len}|${first}|${last}|${digest}`;
  }

  useEffect(() => {
    if (serverPagination || typeof onFilteredRowsChange !== 'function') {
      return;
    }

    const sig = signatureOfRows(sortedRows);

    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        if (isMountedRef.current) {
          onFilteredRowsChange(sortedRows.map(r => r.original as D));
        }
      });
    }

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sortedRows, serverPagination, onFilteredRowsChange]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: initialWidth, height: initialHeight }}
    >
      {hasGlobalControl ? (
        <div ref={globalControlRef} className="form-inline dt-controls">
          <Flex
            wrap
            className="row"
            align="center"
            justify="space-between"
            gap="middle"
          >
            {hasPagination ? (
              <SelectPageSize
                total={resultsSize}
                current={resultCurrentPageSize}
                options={pageSizeOptions}
                selectRenderer={
                  typeof selectPageSize === 'boolean'
                    ? undefined
                    : selectPageSize
                }
                onChange={setPageSize}
              />
            ) : null}
            <Flex wrap align="center" gap="middle">
              {serverPagination && searchInput && (
                <Space size="small" className="search-select-container">
                  <span className="search-by-label">{t('Search by')}:</span>
                  <SearchSelectDropdown
                    searchOptions={searchOptions}
                    value={serverPaginationData?.searchColumn || ''}
                    onChange={onSearchColChange}
                  />
                </Space>
              )}
              {searchInput && (
                <GlobalFilter<D>
                  searchInput={
                    typeof searchInput === 'boolean' ? undefined : searchInput
                  }
                  preGlobalFilteredRows={preGlobalFilteredRows}
                  setGlobalFilter={
                    manualSearch ? handleSearchChange : setGlobalFilter
                  }
                  filterValue={manualSearch ? initialSearchText : filterValue}
                  id={searchInputId}
                  serverPagination={!!serverPagination}
                  rowCount={rowCount}
                />
              )}
              {renderTimeComparisonDropdown
                ? renderTimeComparisonDropdown()
                : null}
            </Flex>
          </Flex>
        </div>
      ) : null}
      {wrapStickyTable ? wrapStickyTable(renderTable) : renderTable()}
      {hasPagination && resultPageCount > 1 ? (
        <SimplePagination
          ref={paginationRef}
          style={paginationStyle}
          maxPageItemCount={maxPageItemCount}
          pageCount={resultPageCount}
          currentPage={resultCurrentPage}
          onPageChange={resultOnPageChange}
        />
      ) : null}
    </div>
  );
});
