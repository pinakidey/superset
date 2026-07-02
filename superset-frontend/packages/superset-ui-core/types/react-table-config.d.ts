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
 * Module augmentation for @tanstack/react-table v8.
 *
 * In v8, ColumnDef supports a `meta` field for arbitrary per-column data.
 * The augmentation below extends ColumnMeta with Superset-specific fields.
 */
import '@tanstack/react-table';

type ColumnSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    hidden?: boolean;
    cellProps?: Record<string, unknown>;
    className?: string;
    size?: ColumnSize;
    disableSortBy?: boolean;
    v7Header?: unknown;
    v7Cell?: unknown;
    [key: string]: unknown;
  }
}
