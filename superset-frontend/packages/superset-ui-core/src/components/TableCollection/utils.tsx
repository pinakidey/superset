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
 * This file contains utility functions for mapping columns and rows.
 * These functions act as a compatibility layer between Ant Design Table
 * and @tanstack/react-table v8.
 */

import { ReactNode } from 'react';
import type { Column, Row, HeaderGroup } from '@tanstack/react-table';
import type { V8ColumnMeta } from './adaptColumns';

import { SortOrder } from '../Table';

type TableSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const COLUMN_SIZE_MAP: Record<TableSize, number> = {
  xs: 25,
  sm: 50,
  md: 75,
  lg: 100,
  xl: 150,
  xxl: 200,
};

export function mapColumns<T extends object>(
  columns: Column<T, unknown>[],
  headerGroups: HeaderGroup<T>[],
  columnsForWrapText?: string[],
) {
  return columns.map(column => {
    const meta = (column.columnDef.meta ?? {}) as V8ColumnMeta;
    const isSorted = column.getIsSorted();
    const isSortedDesc = isSorted === 'desc';

    return {
      title: meta.v7Header as ReactNode,
      dataIndex: column.id?.includes('.') ? column.id.split('.') : column.id,
      hidden: meta.hidden,
      key: column.id,
      width: meta.size ? COLUMN_SIZE_MAP[meta.size] : undefined,
      ellipsis: !columnsForWrapText?.includes(column.id),
      defaultSortOrder: (isSorted
        ? isSortedDesc
          ? 'descend'
          : 'ascend'
        : undefined) as SortOrder | undefined,
      sorter: column.getCanSort(),
      render: (
        val: unknown,
        record: Record<string, unknown> & { rowId: string },
      ): ReactNode => {
        const v7Cell = meta.v7Cell as
          | ((props: {
              value: unknown;
              row: { original: Record<string, unknown>; id: string };
              column: Column<T, unknown>;
            }) => ReactNode)
          | undefined;

        if (v7Cell) {
          return v7Cell({
            value: val,
            row: { original: record, id: record.rowId },
            column,
          });
        }
        return val as ReactNode;
      },
      className: meta.className,
    };
  });
}

export function mapRows<T extends object>(rows: Row<T>[]) {
  return rows.map(row => ({
    rowId: row.id,
    ...(row.original as Record<string, unknown>),
  }));
}
