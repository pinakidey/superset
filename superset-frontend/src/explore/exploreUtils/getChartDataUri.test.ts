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
import { ensureAppRoot } from 'src/utils/pathUtils';
import { getChartDataUri } from '.';

jest.mock('src/utils/pathUtils');

// eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
describe('Get ChartUri', () => {
  (ensureAppRoot as jest.Mock).mockImplementation(
    (path: string) => `/prefix${path}`,
  );

  test('Get ChartUri when allowDomainSharding:false', () => {
    const result = getChartDataUri({
      path: '/path',
      qs: { key: 'same-string' },
      allowDomainSharding: false,
    });
    expect(result).toBe('http://localhost/prefix/path?key=same-string');
  });

  test('Get ChartUri when allowDomainSharding:true', () => {
    const result = getChartDataUri({
      path: '/path-allowDomainSharding-true',
      qs: { key: 'allowDomainSharding-true' },
      allowDomainSharding: true,
    });
    expect(result).toContain('/prefix/path-allowDomainSharding-true');
    expect(result).toContain('key=allowDomainSharding-true');
  });

  test('Get ChartUri without query string', () => {
    const result = getChartDataUri({
      path: '/path',
      allowDomainSharding: false,
    });
    expect(result).toBe('http://localhost/prefix/path');
  });
});
