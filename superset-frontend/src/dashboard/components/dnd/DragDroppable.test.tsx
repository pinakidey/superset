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
import { render, screen } from 'spec/helpers/testing-library';

import newComponentFactory from 'src/dashboard/util/newComponentFactory';
import { CHART_TYPE, ROW_TYPE } from 'src/dashboard/util/componentTypes';
import {
  DragDroppable,
  Draggable,
  Droppable,
} from 'src/dashboard/components/dnd/DragDroppable';
import { DashboardDndContextProvider } from 'src/dashboard/components/dnd/DashboardDndContext';

// eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
describe('DragDroppable', () => {
  const props = {
    component: newComponentFactory(CHART_TYPE),
    parentComponent: newComponentFactory(ROW_TYPE),
    editMode: false,
    depth: 1,
    index: 0,
    disableDragDrop: false,
  };

  function setup(overrideProps: Record<string, unknown> = {}) {
    const defaultChildren = (provided: Record<string, unknown>) => (
      <div data-test="child-content" {...provided}>
        Test Content
      </div>
    );

    const allProps = { ...props, ...overrideProps };

    const utils = render(
      <DashboardDndContextProvider>
        <DragDroppable {...(allProps as any)}>
          {overrideProps.children || defaultChildren}
        </DragDroppable>
      </DashboardDndContextProvider>,
    );
    return {
      ...utils,
      children: overrideProps.children || defaultChildren,
    };
  }

  test('should call its child function', () => {
    const renderChild = jest.fn((provided: Record<string, unknown>) => (
      <div data-test="child-content" {...provided}>
        Test Content
      </div>
    ));

    setup({ children: renderChild });
    expect(renderChild).toHaveBeenCalled();
    expect(renderChild.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        'data-test': 'dragdroppable-content',
      }),
    );
  });

  test('should call its child function with "dragSourceRef" if editMode=true', () => {
    const renderChild = jest.fn().mockImplementation(provided => (
      <div data-test="child-content" {...provided}>
        Test Content
      </div>
    ));

    setup({ children: renderChild, editMode: false });
    expect(renderChild).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test': 'dragdroppable-content',
      }),
    );

    setup({ children: renderChild, editMode: true });
    expect(renderChild).toHaveBeenLastCalledWith(
      expect.objectContaining({
        'data-test': 'dragdroppable-content',
        dragSourceRef: expect.any(Function),
      }),
    );
  });

  test('should handle orientation prop correctly', () => {
    const { container } = setup({ orientation: 'column' });
    expect(container.firstChild).toHaveClass('dragdroppable-column');

    const { container: container2 } = setup({ orientation: 'row' });
    expect(container2.firstChild).toHaveClass('dragdroppable-row');
  });

  test('should render the wrapper div with proper test id', () => {
    setup();
    expect(screen.getByTestId('dragdroppable-object')).toBeInTheDocument();
  });

  test('should render Draggable export', () => {
    render(
      <DashboardDndContextProvider>
        <Draggable {...(props as any)} editMode>
          {(provided: Record<string, unknown>) => (
            <div data-test="child-content" {...provided}>
              Test Content
            </div>
          )}
        </Draggable>
      </DashboardDndContextProvider>,
    );
    expect(screen.getByTestId('dragdroppable-object')).toBeInTheDocument();
  });

  test('should render Droppable export', () => {
    render(
      <DashboardDndContextProvider>
        <Droppable {...(props as any)} editMode>
          {(provided: Record<string, unknown>) => (
            <div data-test="child-content" {...provided}>
              Test Content
            </div>
          )}
        </Droppable>
      </DashboardDndContextProvider>,
    );
    expect(screen.getByTestId('dragdroppable-object')).toBeInTheDocument();
  });
});
