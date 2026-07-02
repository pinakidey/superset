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

import type { Row } from '@tanstack/react-table';
import { sortAlphanumericCaseInsensitive } from '../src/DataTable/utils/sortAlphanumericCaseInsensitive';

/**
 * Create a mock Row with a getValue method matching v8 API.
 */
function mockRow<D extends object>(values: Record<string, unknown>): Row<D> {
  return {
    getValue: (columnId: string) => values[columnId],
    _valuesCache: values,
  } as unknown as Row<D>;
}

const testData = [
  { col: 'test value' },
  { col: 'a lowercase test value' },
  { col: '5' },
  { col: NaN },
  { col: '1234' },
  { col: Infinity },
  { col: '.!# value starting with non-letter characters' },
  { col: 'An uppercase test value' },
  { col: undefined },
  { col: null },
];

describe('sortAlphanumericCaseInsensitive', () => {
  test('Sort rows', () => {
    const rows = testData.map(d => mockRow<object>(d));
    const sorted = [...rows].sort((a, b) =>
      sortAlphanumericCaseInsensitive(a, b, 'col'),
    );

    expect(sorted.map(r => r.getValue('col'))).toEqual([
      null,
      undefined,
      Infinity,
      NaN,
      '.!# value starting with non-letter characters',
      '1234',
      '5',
      'a lowercase test value',
      'An uppercase test value',
      'test value',
    ]);
  });
});

const testDataMulti = [
  { colA: 'group 1', colB: '10' },
  { colA: 'group 1', colB: '15' },
  { colA: 'group 1', colB: '20' },
  { colA: 'group 2', colB: '10' },
  { colA: 'group 3', colB: '10' },
  { colA: 'group 3', colB: '15' },
  { colA: 'group 3', colB: '10' },
];

/**
 * Multi-column sort: sort by first comparator, then by second.
 * `dirs` array: true = descending, false = ascending.
 */
function multiColumnSort<D extends object>(
  data: Row<D>[],
  comparators: Array<(a: Row<D>, b: Row<D>) => number>,
  dirs: boolean[],
): Row<D>[] {
  return [...data].sort((a, b) => {
    for (let i = 0; i < comparators.length; i += 1) {
      const result = comparators[i](a, b);
      if (result !== 0) {
        return dirs[i] ? -result : result;
      }
    }
    return 0;
  });
}

describe('sortAlphanumericCaseInsensitiveMulti', () => {
  test('Sort rows', () => {
    const rows = testDataMulti.map(d => mockRow<object>(d));
    const sorted = multiColumnSort(
      rows,
      [
        (a, b) => sortAlphanumericCaseInsensitive(a, b, 'colA'),
        (a, b) => sortAlphanumericCaseInsensitive(a, b, 'colB'),
      ],
      [true, false],
    );

    expect(
      sorted.map(r => ({
        colA: r.getValue('colA'),
        colB: r.getValue('colB'),
      })),
    ).toEqual([
      { colA: 'group 1', colB: '20' },
      { colA: 'group 1', colB: '15' },
      { colA: 'group 1', colB: '10' },
      { colA: 'group 2', colB: '10' },
      { colA: 'group 3', colB: '15' },
      { colA: 'group 3', colB: '10' },
      { colA: 'group 3', colB: '10' },
    ]);
  });
});
