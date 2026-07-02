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
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
  CSSProperties,
  ReactNode,
  HTMLAttributes,
} from 'react';
import cx from 'classnames';
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { styled } from '@apache-superset/core/theme';
import { TAB_TYPE } from 'src/dashboard/util/componentTypes';
import { DROP_FORBIDDEN } from 'src/dashboard/util/getDropPosition';
import type { LayoutItem } from 'src/dashboard/types';
import type { DragItem, DropResult } from './dragDroppableConfig';
import handleHover from './handleHover';
import { useDashboardDrag } from './DashboardDndContext';

const DragDroppableStyles = styled.div`
  position: relative;
  &.dragdroppable--dragging {
    opacity: 0.2;
  }
`;

interface DropIndicatorProps {
  className: string;
}

interface ChildProps {
  dragSourceRef?: (node: HTMLElement | null) => void;
  dragListeners?: HTMLAttributes<HTMLElement>;
  dropIndicatorProps: DropIndicatorProps | null;
  draggingTabOnTab?: boolean;
  'data-test': string;
}

interface DragDroppableOwnProps {
  component: LayoutItem;
  parentComponent?: LayoutItem;
  index: number;
  depth: number;
  disableDragDrop?: boolean;
  orientation?: 'row' | 'column';
  editMode?: boolean;
  useEmptyDragPreview?: boolean;
  className?: string | null;
  style?: CSSProperties | null;
  onDrop?: (dropResult: DropResult) => void;
  onHover?: () => void;
  onDropIndicatorChange?: (dropIndicator: string | null) => void;
  onDragTab?: (dragComponentId: string | undefined) => void;
  dropToChild?: boolean | ((draggingItem: DragItem) => boolean);
  children: (childProps: ChildProps) => ReactNode;
  'data-test'?: string;
}

type DragDropMode = 'drag-only' | 'drop-only' | 'both';

interface InternalProps extends DragDroppableOwnProps {
  mode: DragDropMode;
}

function DragDroppableInner({
  component,
  parentComponent,
  index,
  depth,
  disableDragDrop = false,
  orientation = 'row',
  editMode = false,
  className = null,
  style = null,
  onDrop,
  onHover,
  onDropIndicatorChange,
  onDragTab,
  dropToChild = false,
  children,
  mode,
  'data-test': dataTest,
}: InternalProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);
  const [dropIndicator, setDropIndicator] = useState<string | null>(null);
  const { activeItem } = useDashboardDrag();

  const enableDrag = mode !== 'drop-only';
  const enableDrop = mode !== 'drag-only';

  // Unique IDs for @dnd-kit
  const dragId = `dashboard-drag-${component.id}-${index}`;
  const dropId = `dashboard-drop-${component.id}-${index}`;

  const {
    setNodeRef: setDragNodeRef,
    listeners: dragListeners,
    attributes: dragAttributes,
    isDragging,
  } = useDraggable({
    id: dragId,
    data: {
      type: component.type,
      id: component.id,
      meta: component.meta,
      index,
      parentId: parentComponent?.id,
      parentType: parentComponent?.type,
    } satisfies DragItem,
    disabled: disableDragDrop || !editMode || !enableDrag,
  });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: dropId,
    data: {
      component,
      parentComponent,
      index,
      depth,
      orientation,
      onDrop,
      dropToChild,
    },
    disabled: disableDragDrop || !enableDrop,
  });

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Set up combined ref for the wrapper div (droppable target)
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      elementRef.current = node;
      if (enableDrop) setDropNodeRef(node);
    },
    [enableDrop, setDropNodeRef],
  );

  // Create a component-like object for handleHover/handleDrop compatibility
  const getComponentAdapter = useCallback(
    (isDraggingOverShallow: boolean) => ({
      mounted: mountedRef.current,
      ref: elementRef.current,
      props: {
        component,
        parentComponent,
        index,
        depth,
        disableDragDrop,
        orientation,
        isDraggingOverShallow,
        onDrop,
        onHover,
        dropToChild,
      },
      setState: (fn: () => { dropIndicator: string | null }) => {
        setDropIndicator(fn().dropIndicator);
      },
    }),
    [
      component,
      parentComponent,
      index,
      depth,
      disableDragDrop,
      orientation,
      onDrop,
      onHover,
      dropToChild,
    ],
  );

  // Monitor drag moves to show drop indicators
  useDndMonitor({
    onDragMove(event) {
      if (
        !mountedRef.current ||
        !elementRef.current ||
        disableDragDrop ||
        !enableDrop
      )
        return;

      const rect = elementRef.current.getBoundingClientRect();
      const activatorEvent = event.activatorEvent as PointerEvent;
      const clientX = activatorEvent.clientX + event.delta.x;
      const clientY = activatorEvent.clientY + event.delta.y;

      // Check if pointer is within our bounds
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setDropIndicator(null);
        return;
      }

      const activeData = event.active.data.current as DragItem;
      const isDraggingOverShallow = event.over?.id === dropId;

      handleHover(
        {
          component,
          parentComponent,
          index,
          depth,
          disableDragDrop,
          orientation,
          isDraggingOverShallow,
          onDrop,
          onHover,
          dropToChild,
        },
        { x: clientX, y: clientY },
        activeData,
        getComponentAdapter(isDraggingOverShallow),
      );
    },

    onDragEnd() {
      handleHover.cancel();
      setDropIndicator(null);
    },

    onDragCancel() {
      handleHover.cancel();
      setDropIndicator(null);
    },
  });

  // Notify about drop indicator changes
  useEffect(() => {
    onDropIndicatorChange?.(dropIndicator);
  }, [dropIndicator, onDropIndicatorChange]);

  // Track active drag component for tab dragging
  const activeId = activeItem?.id;
  const prevActiveIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (activeId !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeId;
      if (onDragTab) {
        setTimeout(() => {
          onDragTab(activeId);
        });
      }
    }
  }, [activeId, onDragTab]);

  // Compute drop indicator props
  const dropIndicatorProps: DropIndicatorProps | null = dropIndicator
    ? {
        className: cx(
          'drop-indicator',
          dropIndicator === DROP_FORBIDDEN && 'drop-indicator--forbidden',
          `drop-indicator--${dropIndicator}`,
        ),
      }
    : null;

  // Determine if we're dragging a tab on a tab
  const draggingTabOnTab =
    activeItem?.type === TAB_TYPE && component.type === TAB_TYPE;

  const childProps: ChildProps = editMode
    ? {
        dragSourceRef: enableDrag ? setDragNodeRef : undefined,
        dragListeners: enableDrag ? dragListeners : undefined,
        dropIndicatorProps,
        draggingTabOnTab,
        'data-test': 'dragdroppable-content',
      }
    : {
        dropIndicatorProps: null,
        'data-test': 'dragdroppable-content',
      };

  return (
    <DragDroppableStyles
      ref={setRef}
      data-test={dataTest || 'dragdroppable-object'}
      className={cx(
        'dragdroppable',
        editMode && 'dragdroppable--edit-mode',
        isDragging && 'dragdroppable--dragging',
        orientation === 'row' && 'dragdroppable-row',
        orientation === 'column' && 'dragdroppable-column',
        className,
      )}
      style={style ?? undefined}
    >
      {children(childProps)}
    </DragDroppableStyles>
  );
}

/**
 * DragDroppable — supports both drag and drop.
 */
export const DragDroppable = memo(function DragDroppable(
  props: DragDroppableOwnProps,
) {
  return <DragDroppableInner {...props} mode="both" />;
});

/**
 * Draggable — only drag source, no drop target.
 */
export const Draggable = memo(function Draggable(
  props: DragDroppableOwnProps,
) {
  return <DragDroppableInner {...props} mode="drag-only" />;
});

/**
 * Droppable — only drop target, no drag source.
 */
export const Droppable = memo(function Droppable(
  props: DragDroppableOwnProps,
) {
  return <DragDroppableInner {...props} mode="drop-only" />;
});
