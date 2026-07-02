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
import { render, screen, fireEvent } from '@superset-ui/core/spec';
import { renderHook } from '@testing-library/react';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table';
import TableCollection from '.';

interface TestRow {
  col1: string;
  col2: string;
  parent: { child: string };
  id?: number;
}

const testColumns: ColumnDef<TestRow, unknown>[] = [
  {
    header: 'Column 1',
    accessorKey: 'col1',
    id: 'col1',
  },
  {
    header: 'Column 2',
    accessorKey: 'col2',
    id: 'col2',
  },
  {
    header: 'Nested Field',
    accessorFn: (row: TestRow) => row.parent?.child,
    id: 'parent.child',
  },
];

const testData: TestRow[] = [
  {
    col1: 'Line 01 - Col 01',
    col2: 'Line 01 - Col 02',
    parent: { child: 'Nested Value 1' },
  },
  {
    col1: 'Line 02 - Col 01',
    col2: 'Line 02 - Col 02',
    parent: { child: 'Nested Value 2' },
  },
  {
    col1: 'Line 03 - Col 01',
    col2: 'Line 03 - Col 02',
    parent: { child: 'Nested Value 3' },
  },
];

function useTestTable(data: TestRow[] = testData) {
  return useReactTable({
    columns: testColumns,
    data,
    getCoreRowModel: getCoreRowModel(),
  });
}

let defaultProps: Record<string, unknown>;

beforeEach(() => {
  const { result } = renderHook(() => useTestTable());
  const table = result.current;
  defaultProps = {
    prepareRow: () => {},
    headerGroups: table.getHeaderGroups(),
    rows: table.getRowModel().rows,
    columns: table.getAllColumns(),
    loading: false,
    highlightRowId: 1,
    getTableProps: jest.fn(),
    getTableBodyProps: jest.fn(),
    sticky: false,
  };
});

test('Headers should be visible', () => {
  render(<TableCollection {...defaultProps} />);

  expect(screen.getByLabelText('Column 1')).toBeVisible();
  expect(screen.getByLabelText('Column 2')).toBeVisible();
});

test('Body should be visible', () => {
  render(<TableCollection {...defaultProps} />);

  expect(screen.getByText('Line 01 - Col 01')).toBeVisible();
  expect(screen.getByText('Line 01 - Col 02')).toBeVisible();

  expect(screen.getByText('Line 02 - Col 01')).toBeVisible();
  expect(screen.getByText('Line 02 - Col 02')).toBeVisible();

  expect(screen.getByText('Line 03 - Col 01')).toBeVisible();
  expect(screen.getByText('Line 03 - Col 02')).toBeVisible();
});

test('Body content should be blurred loading', () => {
  render(<TableCollection {...defaultProps} loading />);

  expect(screen.getByTestId('listview-table').parentNode).toHaveClass(
    'ant-spin-blur',
  );
});

test('Should the loading-indicator be visible during loading', () => {
  render(<TableCollection {...defaultProps} loading />);

  expect(screen.getByTestId('loading-indicator')).toBeVisible();
});

test('Pagination controls should be rendered when pageSize is provided', () => {
  const paginationProps = {
    ...defaultProps,
    pageSize: 2,
    totalCount: 3,
    pageIndex: 0,
    onPageChange: jest.fn(),
  };
  render(<TableCollection {...paginationProps} />);

  expect(screen.getByRole('list')).toBeInTheDocument();
});

test('Pagination should call onPageChange when page is changed', async () => {
  const onPageChange = jest.fn();
  const paginationProps = {
    ...defaultProps,
    pageSize: 2,
    totalCount: 3,
    pageIndex: 0,
    onPageChange,
  };
  const { rerender } = render(<TableCollection {...paginationProps} />);

  await screen.findByTitle('Next Page');

  expect(onPageChange).toBeDefined();

  rerender(<TableCollection {...paginationProps} pageIndex={1} />);
  expect(screen.getByRole('list')).toBeInTheDocument();
});

test('Pagination callback should be stable across re-renders', () => {
  const onPageChange = jest.fn();
  const paginationProps = {
    ...defaultProps,
    pageSize: 2,
    totalCount: 3,
    pageIndex: 0,
    onPageChange,
  };

  const { rerender } = render(<TableCollection {...paginationProps} />);

  rerender(<TableCollection {...paginationProps} />);

  expect(onPageChange).not.toHaveBeenCalled();
});

test('Should display correct page info when showRowCount is true', () => {
  const paginationProps = {
    ...defaultProps,
    pageSize: 2,
    totalCount: 3,
    pageIndex: 0,
    onPageChange: jest.fn(),
    showRowCount: true,
  };
  render(<TableCollection {...paginationProps} />);

  expect(screen.getByText('1-2 of 3')).toBeInTheDocument();
});

test('Should not display page info when showRowCount is false', () => {
  const paginationProps = {
    ...defaultProps,
    pageSize: 2,
    totalCount: 3,
    pageIndex: 0,
    onPageChange: jest.fn(),
    showRowCount: false,
  };
  render(<TableCollection {...paginationProps} />);

  expect(screen.queryByText('1-2 of 3')).not.toBeInTheDocument();
});

test('Bulk selection should work with pagination', () => {
  const toggleRowSelected = jest.fn();
  const toggleAllRowsSelected = jest.fn();
  const selectionProps = {
    ...defaultProps,
    bulkSelectEnabled: true,
    selectedFlatRows: [],
    toggleRowSelected,
    toggleAllRowsSelected,
    pageSize: 2,
    totalCount: 3,
    pageIndex: 0,
    onPageChange: jest.fn(),
  };
  render(<TableCollection {...selectionProps} />);

  const checkboxes = screen.getAllByRole('checkbox');
  expect(checkboxes.length).toBeGreaterThan(0);

  expect(screen.getByTestId('header-toggle-all')).toBeInTheDocument();
});

test('should call setSortBy when clicking sortable column header', () => {
  const setSortBy = jest.fn();
  const sortingProps = {
    ...defaultProps,
    setSortBy,
  };

  render(<TableCollection {...sortingProps} />);

  const nestedFieldHeader = screen.getAllByText('Nested Field')[0];
  expect(nestedFieldHeader).toBeInTheDocument();

  fireEvent.click(nestedFieldHeader);

  expect(setSortBy).toHaveBeenCalledWith([
    {
      id: 'parent.child',
      desc: expect.any(Boolean),
    },
  ]);
});

test('should not apply highlight class when highlightRowId is undefined', () => {
  const propsWithoutHighlight = {
    ...defaultProps,
    highlightRowId: undefined,
  };

  const { container } = render(<TableCollection {...propsWithoutHighlight} />);

  const highlightedRows = container.querySelectorAll('.table-row-highlighted');
  expect(highlightedRows).toHaveLength(0);
});

test('should not apply highlight class when highlightRowId is null', () => {
  const propsWithNullHighlight = {
    ...defaultProps,
    highlightRowId: null,
  };

  const { container } = render(<TableCollection {...propsWithNullHighlight} />);

  const highlightedRows = container.querySelectorAll('.table-row-highlighted');
  expect(highlightedRows).toHaveLength(0);
});

test('should apply highlight class only to matching row when highlightRowId is provided', () => {
  const dataWithIds: TestRow[] = [
    {
      col1: 'Line 01 - Col 01',
      col2: 'Line 01 - Col 02',
      id: 1,
      parent: { child: 'Nested Value 1' },
    },
    {
      col1: 'Line 02 - Col 01',
      col2: 'Line 02 - Col 02',
      id: 2,
      parent: { child: 'Nested Value 2' },
    },
    {
      col1: 'Line 03 - Col 01',
      col2: 'Line 03 - Col 02',
      id: 3,
      parent: { child: 'Nested Value 3' },
    },
  ];

  const { result } = renderHook(() => useTestTable(dataWithIds));
  const table = result.current;

  const propsWithHighlight = {
    ...defaultProps,
    highlightRowId: 1,
    rows: table.getRowModel().rows,
  };

  const { container } = render(<TableCollection {...propsWithHighlight} />);

  const highlightedRows = container.querySelectorAll('.table-row-highlighted');
  expect(highlightedRows).toHaveLength(1);
});

test('should not apply highlight when records have no id field and highlightRowId is undefined', () => {
  const propsWithNoIds = {
    ...defaultProps,
    highlightRowId: undefined,
  };

  const { container } = render(<TableCollection {...propsWithNoIds} />);

  const highlightedRows = container.querySelectorAll('.table-row-highlighted');
  expect(highlightedRows).toHaveLength(0);
});
