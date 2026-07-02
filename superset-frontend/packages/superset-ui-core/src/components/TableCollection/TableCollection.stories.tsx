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
import { useMemo, useState, useCallback } from 'react';
import { Meta, StoryFn } from '@storybook/react-webpack5';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import TableCollection from '.';
import { TableSize } from '../Table';

export default {
  title: 'Components/TableCollection',
  component: TableCollection,
} as Meta<typeof TableCollection>;

interface SampleData {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

const generateSampleData = (count: number): SampleData[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ['Admin', 'Editor', 'Viewer'][i % 3],
    status: ['Active', 'Inactive', 'Pending'][i % 3],
    lastLogin: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString(),
  }));

const sampleColumns: ColumnDef<SampleData, unknown>[] = [
  { header: 'ID', accessorKey: 'id', id: 'id' },
  { header: 'Name', accessorKey: 'name', id: 'name' },
  { header: 'Email', accessorKey: 'email', id: 'email' },
  { header: 'Role', accessorKey: 'role', id: 'role' },
  { header: 'Status', accessorKey: 'status', id: 'status' },
  { header: 'Last Login', accessorKey: 'lastLogin', id: 'lastLogin' },
];

export const Basic: StoryFn = () => {
  const data = useMemo(() => generateSampleData(10), []);

  const table = useReactTable({
    columns: sampleColumns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <TableCollection
      headerGroups={table.getHeaderGroups()}
      rows={table.getRowModel().rows}
      columns={table.getAllColumns()}
      loading={false}
      totalCount={data.length}
      pageSize={10}
    />
  );
};

Basic.parameters = {
  docs: {
    description: {
      story:
        'Basic TableCollection with sortable columns. Click column headers to sort.',
    },
  },
};

export const WithPagination: StoryFn = () => {
  const allData = useMemo(() => generateSampleData(50), []);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const paginatedData = useMemo(
    () => allData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [allData, pageIndex],
  );

  const cols = useMemo(
    () => sampleColumns.filter(c => c.id !== 'lastLogin'),
    [],
  );

  const table = useReactTable({
    columns: cols,
    data: paginatedData,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handlePageChange = useCallback((page: number) => {
    setPageIndex(page);
  }, []);

  return (
    <TableCollection
      headerGroups={table.getHeaderGroups()}
      rows={table.getRowModel().rows}
      columns={table.getAllColumns()}
      loading={false}
      pageIndex={pageIndex}
      pageSize={pageSize}
      totalCount={allData.length}
      onPageChange={handlePageChange}
      showRowCount
    />
  );
};

WithPagination.parameters = {
  docs: {
    description: {
      story:
        'TableCollection with server-side pagination. Shows "X-Y of Z" row count.',
    },
  },
};

export const WithRowSelection: StoryFn = () => {
  const data = useMemo(() => generateSampleData(10), []);
  const [selectedRows, setSelectedRows] = useState<Row<SampleData>[]>([]);

  const cols = useMemo(
    () =>
      sampleColumns.filter(c =>
        ['id', 'name', 'email', 'role'].includes(c.id as string),
      ),
    [],
  );

  const table = useReactTable({
    columns: cols,
    data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const toggleRowSelected = useCallback(
    (rowId: string, selected: boolean) => {
      const row = rows.find(r => r.id === rowId);
      if (row) {
        if (selected) {
          setSelectedRows(prev => [...prev, row]);
        } else {
          setSelectedRows(prev => prev.filter(r => r.id !== rowId));
        }
      }
    },
    [rows],
  );

  const toggleAllRowsSelected = useCallback(
    (selected?: boolean) => {
      if (selected) {
        setSelectedRows(rows);
      } else {
        setSelectedRows([]);
      }
    },
    [rows],
  );

  return (
    <div>
      <div style={{ marginBottom: 16, color: '#666' }}>
        Selected: {selectedRows.length} row(s)
        {selectedRows.length > 0 && (
          <span> - IDs: {selectedRows.map(r => r.original.id).join(', ')}</span>
        )}
      </div>
      <TableCollection
        headerGroups={table.getHeaderGroups()}
        rows={rows}
        columns={table.getAllColumns()}
        loading={false}
        bulkSelectEnabled
        selectedFlatRows={selectedRows}
        toggleRowSelected={toggleRowSelected}
        toggleAllRowsSelected={toggleAllRowsSelected}
        totalCount={rows.length}
        pageSize={10}
      />
    </div>
  );
};

WithRowSelection.parameters = {
  docs: {
    description: {
      story:
        'TableCollection with bulk selection enabled. Use checkboxes to select individual rows or all rows.',
    },
  },
};

export const LoadingState: StoryFn = () => {
  const data: SampleData[] = useMemo(() => [], []);
  const cols = useMemo(
    () => sampleColumns.filter(c => c.id !== 'lastLogin'),
    [],
  );

  const table = useReactTable({
    columns: cols,
    data,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <TableCollection
      headerGroups={table.getHeaderGroups()}
      rows={table.getRowModel().rows}
      columns={table.getAllColumns()}
      loading
      totalCount={0}
      pageSize={10}
    />
  );
};

LoadingState.parameters = {
  docs: {
    description: {
      story: 'TableCollection in loading state with a spinner overlay.',
    },
  },
};

export const TableSizes: StoryFn = () => {
  const data = useMemo(() => generateSampleData(5), []);
  const cols = useMemo(
    () =>
      sampleColumns.filter(c =>
        ['id', 'name', 'email', 'role'].includes(c.id as string),
      ),
    [],
  );

  const sizes: TableSize[] = [
    TableSize.Small,
    TableSize.Middle,
    TableSize.Large,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {sizes.map(size => {
        const table = useReactTable({
          columns: cols,
          data,
          getCoreRowModel: getCoreRowModel(),
          getSortedRowModel: getSortedRowModel(),
        });

        return (
          <div key={size}>
            <h4 style={{ marginBottom: 8 }}>Size: {size}</h4>
            <TableCollection
              headerGroups={table.getHeaderGroups()}
              rows={table.getRowModel().rows}
              columns={table.getAllColumns()}
              loading={false}
              size={size}
              totalCount={data.length}
              pageSize={10}
            />
          </div>
        );
      })}
    </div>
  );
};

TableSizes.parameters = {
  docs: {
    description: {
      story: 'TableCollection in different sizes: small, middle, and large.',
    },
  },
};

export const WithControlledSorting: StoryFn = () => {
  const [sortBy, setSortBy] = useState<SortingState>([
    { id: 'name', desc: false },
  ]);

  const data = useMemo(() => {
    const rawData = generateSampleData(15);
    if (sortBy.length > 0) {
      const { id, desc } = sortBy[0];
      return [...rawData].sort((a, b) => {
        const aVal = a[id as keyof SampleData];
        const bVal = b[id as keyof SampleData];
        if (aVal < bVal) return desc ? 1 : -1;
        if (aVal > bVal) return desc ? -1 : 1;
        return 0;
      });
    }
    return rawData;
  }, [sortBy]);

  const cols = useMemo(
    () => sampleColumns.filter(c => c.id !== 'lastLogin'),
    [],
  );

  const table = useReactTable({
    columns: cols,
    data,
    state: { sorting: sortBy },
    onSortingChange: setSortBy,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  return (
    <div>
      <div style={{ marginBottom: 16, color: '#666' }}>
        Current sort:{' '}
        {sortBy.length > 0
          ? `${sortBy[0].id} (${sortBy[0].desc ? 'descending' : 'ascending'})`
          : 'none'}
      </div>
      <TableCollection
        headerGroups={table.getHeaderGroups()}
        rows={table.getRowModel().rows}
        columns={table.getAllColumns()}
        loading={false}
        setSortBy={setSortBy}
        totalCount={data.length}
        pageSize={15}
      />
    </div>
  );
};

WithControlledSorting.parameters = {
  docs: {
    description: {
      story:
        'TableCollection with controlled (server-side) sorting. Click column headers to sort.',
    },
  },
};

export const WithRowHighlighting: StoryFn = () => {
  const data = useMemo(() => generateSampleData(10), []);
  const [highlightRowId, setHighlightRowId] = useState<number | undefined>(3);

  const cols = useMemo(
    () =>
      sampleColumns.filter(c =>
        ['id', 'name', 'email', 'role'].includes(c.id as string),
      ),
    [],
  );

  const table = useReactTable({
    columns: cols,
    data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label>
          Highlight row ID:{' '}
          <select
            value={highlightRowId ?? ''}
            onChange={e =>
              setHighlightRowId(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          >
            <option value="">None</option>
            {data.map(d => (
              <option key={d.id} value={d.id}>
                {d.id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TableCollection
        headerGroups={table.getHeaderGroups()}
        rows={table.getRowModel().rows}
        columns={table.getAllColumns()}
        loading={false}
        highlightRowId={highlightRowId}
        totalCount={data.length}
        pageSize={10}
      />
    </div>
  );
};

WithRowHighlighting.parameters = {
  docs: {
    description: {
      story:
        'TableCollection with row highlighting. Use the dropdown to highlight a specific row.',
    },
  },
};
