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
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  FC,
  ReactNode,
} from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
  pointerWithin,
} from '@dnd-kit/core';
import type { DragItem } from './dragDroppableConfig';
import handleDrop from './handleDrop';
import { clearDropCache } from '../../util/getDropPosition';

interface DashboardDragContextValue {
  activeItem: DragItem | null;
  isDragging: boolean;
}

export const DashboardDragContext = createContext<DashboardDragContextValue>({
  activeItem: null,
  isDragging: false,
});

export const useDashboardDrag = (): DashboardDragContextValue =>
  useContext(DashboardDragContext);

/**
 * Custom collision detection that returns all droppables containing the
 * pointer, sorted by area (smallest first). This ensures the most specific
 * (deepest) drop target is tried first during drop handling, matching the
 * traversal order of react-dnd's nested DropTarget system.
 */
const pointerWithinSmallestFirst: CollisionDetection = args => {
  const collisions = pointerWithin(args);
  return collisions.sort((a, b) => {
    const rectA = args.droppableRects.get(a.id);
    const rectB = args.droppableRects.get(b.id);
    if (!rectA || !rectB) return 0;
    const areaA = rectA.width * rectA.height;
    const areaB = rectB.width * rectB.height;
    return areaA - areaB;
  });
};

interface DashboardDndContextProviderProps {
  children: ReactNode;
}

export const DashboardDndContextProvider: FC<
  DashboardDndContextProviderProps
> = ({ children }) => {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveItem(event.active.data.current as DragItem);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, collisions } = event;
    const activeData = active.data.current as DragItem;

    if (collisions && activeData) {
      const activatorEvent = event.activatorEvent as PointerEvent;
      const clientX = activatorEvent.clientX + event.delta.x;
      const clientY = activatorEvent.clientY + event.delta.y;
      const clientOffset = { x: clientX, y: clientY };

      // Iterate collisions from smallest (shallowest) to largest.
      // The first droppable that produces a valid drop result wins,
      // mirroring react-dnd's nested DropTarget traversal.
      for (const collision of collisions) {
        const droppableData = collision.data?.droppableContainer?.data?.current;
        const droppableNode = collision.data?.droppableContainer?.node?.current;

        if (droppableData && droppableNode) {
          const {
            component,
            parentComponent,
            index,
            depth,
            orientation,
            onDrop,
            dropToChild,
          } = droppableData;

          const isDraggingOverShallow = collision.id === collisions[0]?.id;

          const adapter = {
            mounted: true,
            ref: droppableNode,
            props: {
              component,
              parentComponent,
              index,
              depth,
              disableDragDrop: false,
              orientation,
              isDraggingOverShallow,
              onDrop,
              dropToChild,
            },
            setState: () => {},
          };

          const result = handleDrop(
            adapter.props,
            clientOffset,
            activeData,
            adapter,
          );
          if (result) {
            break;
          }
        }
      }
    }

    clearDropCache();
    setActiveItem(null);
    setIsDragging(false);
  }, []);

  const handleDragCancel = useCallback(() => {
    clearDropCache();
    setActiveItem(null);
    setIsDragging(false);
  }, []);

  const contextValue = useMemo(
    () => ({ activeItem, isDragging }),
    [activeItem, isDragging],
  );

  return (
    <DashboardDragContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithinSmallestFirst}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
      </DndContext>
    </DashboardDragContext.Provider>
  );
};
