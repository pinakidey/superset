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
import type { StoreEnhancer } from 'redux';

interface PersistStateConfig<TFull, TSubset> {
  key?: string;
  slicer?: (paths: string[]) => (state: TFull) => TSubset;
  serialize?: (subset: TSubset) => string;
  deserialize?: (serialized: string) => TSubset;
  merge?: (initialState: TFull, persistedState: TSubset) => TFull;
}

function defaultSlicer(
  paths: string[],
): (state: Record<string, unknown>) => Record<string, unknown> {
  return (state: Record<string, unknown>) => {
    if (paths.length === 0) {
      return state;
    }
    const subset: Record<string, unknown> = {};
    paths.forEach(path => {
      subset[path] = state[path];
    });
    return subset;
  };
}

function defaultMerge<T>(initialState: T, persistedState: Partial<T>): T {
  return { ...initialState, ...persistedState };
}

/**
 * A Redux store enhancer that persists specified state paths to localStorage.
 * Drop-in replacement for the abandoned redux-localstorage package.
 *
 * @param paths - State keys to persist (passed through to the slicer).
 * @param config - Optional overrides for key, slicer, serialize, deserialize, merge.
 */
export default function persistState<TFull, TSubset>(
  paths: string[] = [],
  config: PersistStateConfig<TFull, TSubset> = {},
): StoreEnhancer {
  const {
    key = 'redux',
    slicer = defaultSlicer as (
      paths: string[],
    ) => (state: TFull) => TSubset,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    merge = defaultMerge as (
      initialState: TFull,
      persistedState: TSubset,
    ) => TFull,
  } = config;

  const sliceFn = slicer(paths);

  return next => (reducer, preloadedState) => {
    let finalPreloadedState = preloadedState;

    try {
      const serialized = localStorage.getItem(key);
      if (serialized !== null) {
        const persistedState = deserialize(serialized);
        finalPreloadedState = merge(
          preloadedState as TFull,
          persistedState,
        ) as typeof preloadedState;
      }
    } catch {
      // localStorage may be unavailable or contain invalid JSON
    }

    const store = next(reducer, finalPreloadedState);

    store.subscribe(() => {
      try {
        const state = store.getState();
        const subset = sliceFn(state as TFull);
        const serialized = serialize(subset);
        localStorage.setItem(key, serialized);
      } catch {
        // localStorage may be unavailable or full
      }
    });

    return store;
  };
}
