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
import { useState } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { Slice } from 'src/dashboard/types';
import AddSliceCard from '../AddSliceCard';
import {
  NEW_COMPONENT_SOURCE_TYPE,
  CHART_TYPE,
} from '../../util/componentTypes';
import { useDashboardDrag } from './DashboardDndContext';

interface AddSliceDragPreviewProps {
  slices: Slice[] | null;
}

const staticCardStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  top: 0,
  left: 0,
  zIndex: 101, // this should be higher than top-level tabs
  width: 376 - 2 * 16,
};

const AddSliceDragPreview: React.FC<AddSliceDragPreviewProps> = ({
  slices,
}) => {
  const { activeItem } = useDashboardDrag();
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);

  useDndMonitor({
    onDragStart(event) {
      const activatorEvent = event.activatorEvent as PointerEvent;
      setOffset({ x: activatorEvent.clientX, y: activatorEvent.clientY });
    },
    onDragMove(event) {
      const activatorEvent = event.activatorEvent as PointerEvent;
      setOffset({
        x: activatorEvent.clientX + event.delta.x,
        y: activatorEvent.clientY + event.delta.y,
      });
    },
    onDragEnd() {
      setOffset(null);
    },
    onDragCancel() {
      setOffset(null);
    },
  });

  if (!activeItem || !offset || !slices) return null;

  const slice = slices[activeItem.index];

  // make sure it's a new component and a chart
  const shouldRender =
    slice &&
    activeItem.parentType === NEW_COMPONENT_SOURCE_TYPE &&
    activeItem.type === CHART_TYPE;

  return !shouldRender ? null : (
    <AddSliceCard
      style={{
        ...staticCardStyles,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
      sliceName={slice.slice_name}
      lastModified={slice.changed_on_humanized}
      visType={slice.viz_type}
      datasourceUrl={slice.datasource_url}
      datasourceName={slice.datasource_name}
    />
  );
};

export default AddSliceDragPreview;
