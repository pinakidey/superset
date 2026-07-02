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

/**
 * Adapter to convert react-table v7 style column definitions
 * to @tanstack/react-table v8 ColumnDef format.
 *
 * Allows callers to keep using v7-style column definitions (with Header,
 * accessor, Cell, etc.) while the internals use v8 API.
 */

import { ReactNode } from 'react';
import type {
  ColumnDef,
  CellContext,
  HeaderContext,
} from '@tanstack/react-table';

type ColumnSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * A v7-style column definition.
 */
export interface V7ColumnDef<T extends object> {
  Header?: ReactNode | ((props: Record<string, unknown>) => ReactNode);
  accessor?: string | ((row: T) => unknown);
  Cell?: (props: {
    value: unknown;
    row: { original: T; id: string };
    column: { id: string };
  }) => ReactNode;
  Footer?: ReactNode | ((props: Record<string, unknown>) => ReactNode);
  id?: string;
  disableSortBy?: boolean;
  sortType?: string;
  filter?: string;
  hidden?: boolean;
  size?: ColumnSize;
  className?: string;
  cellProps?: Record<string, unknown>;
  columns?: V7ColumnDef<T>[];
  // Additional properties that callers may use
  [key: string]: unknown;
}

export interface V8ColumnMeta {
  hidden?: boolean;
  size?: ColumnSize;
  className?: string;
  cellProps?: Record<string, unknown>;
  disableSortBy?: boolean;
  v7Header?: unknown;
  v7Cell?: unknown;
  [key: string]: unknown;
}

/**
 * Converts a v7-style column definition to a v8 ColumnDef.
 */
export function adaptV7ColumnToV8<T extends object>(
  col: V7ColumnDef<T>,
): ColumnDef<T, unknown> {
  const accessorKey =
    typeof col.accessor === 'string' ? col.accessor : undefined;
  const accessorFn =
    typeof col.accessor === 'function' ? col.accessor : undefined;
  const colId =
    col.id || accessorKey || `col_${Math.random().toString(36).slice(2, 8)}`;

  const meta: V8ColumnMeta = {
    hidden: col.hidden,
    size: col.size,
    className: col.className,
    cellProps: col.cellProps,
    disableSortBy: col.disableSortBy,
    v7Header: col.Header,
    v7Cell: col.Cell,
  };

  // Copy over any extra properties to meta
  const knownKeys = new Set([
    'Header',
    'accessor',
    'Cell',
    'Footer',
    'id',
    'disableSortBy',
    'sortType',
    'filter',
    'hidden',
    'size',
    'className',
    'cellProps',
    'columns',
  ]);
  for (const key of Object.keys(col)) {
    if (!knownKeys.has(key)) {
      meta[key] = col[key];
    }
  }

  const result: ColumnDef<T, unknown> & { accessorKey?: string } = {
    id: colId,
    meta,
    enableSorting: col.disableSortBy !== true,
  };

  if (accessorKey) {
    result.accessorKey = accessorKey;
  } else if (accessorFn) {
    (
      result as ColumnDef<T, unknown> & { accessorFn: (row: T) => unknown }
    ).accessorFn = accessorFn;
  }

  // Map Header to header
  if (col.Header !== undefined) {
    if (typeof col.Header === 'function') {
      result.header = (ctx: HeaderContext<T, unknown>) =>
        (col.Header as (props: Record<string, unknown>) => ReactNode)({
          column: ctx.column,
          header: ctx.header,
          table: ctx.table,
        });
    } else {
      result.header = () => col.Header as ReactNode;
    }
  }

  // Map Cell to cell
  if (col.Cell) {
    const v7Cell = col.Cell;
    result.cell = (info: CellContext<T, unknown>) =>
      v7Cell({
        value: info.getValue(),
        row: { original: info.row.original, id: info.row.id },
        column: { id: info.column.id },
      });
  }

  // Map Footer
  if (col.Footer !== undefined) {
    if (typeof col.Footer === 'function') {
      result.footer = (ctx: HeaderContext<T, unknown>) =>
        (col.Footer as (props: Record<string, unknown>) => ReactNode)({
          column: ctx.column,
          header: ctx.header,
          table: ctx.table,
        });
    } else {
      result.footer = () => col.Footer as ReactNode;
    }
  }

  // Map sortType to sortingFn
  if (col.sortType) {
    result.sortingFn = col.sortType as ColumnDef<T, unknown>['sortingFn'];
  }

  // Map filter to filterFn
  if (col.filter) {
    result.filterFn = col.filter as ColumnDef<T, unknown>['filterFn'];
  }

  return result;
}

/**
 * Converts an array of v7-style column definitions to v8 ColumnDefs.
 */
export function adaptV7ColumnsToV8<T extends object>(
  columns: V7ColumnDef<T>[],
): ColumnDef<T, unknown>[] {
  return columns.map(col => adaptV7ColumnToV8(col));
}
