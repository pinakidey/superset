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
import { useEffect } from 'react';

export interface KeyboardShortcutConfig {
  key: string;
  func: () => void;
}

const KEY_ALIASES: Record<string, string> = {
  enter: 'enter',
  return: 'enter',
  esc: 'escape',
  escape: 'escape',
  space: ' ',
  left: 'arrowleft',
  right: 'arrowright',
  up: 'arrowup',
  down: 'arrowdown',
};

function normalizeKeyName(key: string): string {
  const lower = key.toLowerCase();
  return KEY_ALIASES[lower] ?? lower;
}

interface ParsedCombo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

function parseKeyCombo(combo: string): ParsedCombo {
  const parts = combo.toLowerCase().split('+');
  const result: ParsedCombo = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: '',
  };

  for (const part of parts) {
    switch (part) {
      case 'ctrl':
        result.ctrl = true;
        break;
      case 'shift':
        result.shift = true;
        break;
      case 'alt':
      case 'opt':
        result.alt = true;
        break;
      case 'cmd':
      case 'meta':
        result.meta = true;
        break;
      default:
        result.key = normalizeKeyName(part);
        break;
    }
  }

  return result;
}

function matchesEvent(event: KeyboardEvent, combo: ParsedCombo): boolean {
  if (event.ctrlKey !== combo.ctrl) return false;
  if (event.shiftKey !== combo.shift) return false;
  if (event.altKey !== combo.alt) return false;
  if (event.metaKey !== combo.meta) return false;

  return event.key.toLowerCase() === combo.key;
}

/**
 * Registers global keyboard shortcuts on `document` and cleans them up
 * when the component unmounts or when `enabled` flips to `false`.
 *
 * Key strings use the same modifier+key format that the codebase already
 * defines in the `KeyboardShortcut` enum (e.g. `"ctrl+r"`,
 * `"ctrl+shift+f"`).
 */
export default function useKeyboardShortcuts(
  shortcuts: KeyboardShortcutConfig[],
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled || shortcuts.length === 0) return undefined;

    const parsedShortcuts = shortcuts.map(s => ({
      combo: parseKeyCombo(s.key),
      func: s.func,
    }));

    const handler = (event: KeyboardEvent) => {
      for (const { combo, func } of parsedShortcuts) {
        if (matchesEvent(event, combo)) {
          event.preventDefault();
          func();
          return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [shortcuts, enabled]);
}
