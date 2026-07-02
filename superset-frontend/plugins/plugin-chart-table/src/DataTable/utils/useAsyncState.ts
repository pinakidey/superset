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
import { useCallback, useRef, useState } from 'react';

/**
 * A debounce hook that replaces react-table v7's useAsyncDebounce.
 * Delays invoking `callback` until `wait` ms after the last call.
 */
function useDebounce<T>(callback: (value: T) => unknown, wait: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (value: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(value);
      }, wait);
    },
    [callback, wait],
  );
}

/**
 * Hook useState to allow always return latest initialValue
 */
export default function useAsyncState<T, F extends (newValue: T) => unknown>(
  initialValue: T,
  callback: F,
  wait = 200,
) {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);
  const onChange = useDebounce(callback, wait);

  // sync updated initialValue
  if (valueRef.current !== initialValue) {
    valueRef.current = initialValue;
    if (value !== initialValue) {
      setValue(initialValue);
    }
  }

  const setBoth = (newValue: T) => {
    setValue(newValue);
    onChange(newValue);
  };

  return [value, setBoth] as [typeof value, typeof setValue];
}
