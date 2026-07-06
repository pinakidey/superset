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
export interface DragItem {
  type: string;
  id: string;
  meta?: Record<string, unknown>;
  index: number;
  parentId?: string;
  parentType?: string;
}

export interface DropResult {
  source: {
    id: string;
    type: string;
    index: number;
  };
  dragging: {
    id: string;
    type: string;
    meta?: Record<string, unknown>;
  };
  destination?: {
    id: string;
    type: string;
    index: number;
  };
  position?: string;
}

export interface DragDroppableComponent {
  mounted: boolean;
  ref?: HTMLElement | null;
  props: {
    component: { id: string; type: string; [key: string]: unknown };
    parentComponent?: { id: string; type: string; [key: string]: unknown };
    index: number;
    depth: number;
    disableDragDrop?: boolean;
    orientation?: 'row' | 'column';
    isDraggingOverShallow?: boolean;
    onDrop?: (dropResult: DropResult) => void;
    onHover?: () => void;
    dropToChild?: boolean | ((draggingItem: DragItem) => boolean);
  };
  setState: (stateUpdate: () => { dropIndicator: string | null }) => void;
}
