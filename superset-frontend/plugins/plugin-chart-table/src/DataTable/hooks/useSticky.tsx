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
  Children,
  cloneElement,
  useRef,
  useMemo,
  useLayoutEffect,
  useCallback,
  useState,
  ReactNode,
  ReactElement,
  ComponentPropsWithRef,
  CSSProperties,
  UIEventHandler,
} from 'react';
import { useTheme, css } from '@apache-superset/core/theme';
import getScrollBarSize from '../utils/getScrollBarSize';
import needScrollBar from '../utils/needScrollBar';
import useMountedMemo from '../utils/useMountedMemo';

type ReactElementWithChildren<
  T extends keyof JSX.IntrinsicElements,
  C extends ReactNode = ReactNode,
> = ReactElement<ComponentPropsWithRef<T> & { children: C }, T>;

type Th = ReactElementWithChildren<'th'>;
type Td = ReactElementWithChildren<'td'>;
type TrWithTh = ReactElementWithChildren<'tr', Th[]>;
type TrWithTd = ReactElementWithChildren<'tr', Td[]>;
type Thead = ReactElementWithChildren<'thead', TrWithTh>;
type Tbody = ReactElementWithChildren<'tbody', TrWithTd>;
type Tfoot = ReactElementWithChildren<'tfoot', TrWithTd>;
type Col = ReactElementWithChildren<'col', null>;
type ColGroup = ReactElementWithChildren<'colgroup', Col>;

export type Table = ReactElementWithChildren<
  'table',
  (Thead | Tbody | Tfoot | ColGroup)[]
>;
export type TableRenderer = () => Table;
export type GetTableSize = () => Partial<StickyState> | undefined;
export type SetStickyState = (size?: Partial<StickyState>) => void;

export type ColumnWidths = number[];

export interface StickyState {
  width?: number;
  height?: number;
  realHeight?: number;
  bodyHeight?: number;
  tableHeight?: number;
  columnWidths?: ColumnWidths;
  hasHorizontalScroll?: boolean;
  hasVerticalScroll?: boolean;
  rendering?: boolean;
  setStickyState?: SetStickyState;
}

export interface UseStickyTableOptions {
  getTableSize?: GetTableSize;
}

export interface UseStickyInstanceProps {
  wrapStickyTable: (renderer: TableRenderer) => ReactNode;
  setStickyState: SetStickyState;
}

export type UseStickyState = {
  sticky: StickyState;
};

const sum = (a: number, b: number) => a + b;
const mergeStyleProp = (
  node: ReactElement<{ style?: CSSProperties }>,
  style: CSSProperties,
) => ({
  style: {
    ...node.props.style,
    ...style,
  },
});
const fixedTableLayout: CSSProperties = { tableLayout: 'fixed' };

/**
 * An HOC for generating sticky header and fixed-height scrollable area
 */
function StickyWrap({
  sticky = {},
  width: maxWidth,
  height: maxHeight,
  children: table,
  setStickyState,
}: {
  width: number;
  height: number;
  setStickyState: SetStickyState;
  children: Table;
  sticky?: StickyState;
}) {
  const theme = useTheme();

  if (!table || table.type !== 'table') {
    throw new Error('<StickyWrap> must have only one <table> element as child');
  }
  let thead: Thead | undefined;
  let tbody: Tbody | undefined;
  let tfoot: Tfoot | undefined;

  Children.forEach(table.props.children, node => {
    if (!node) {
      return;
    }
    if (node.type === 'thead') {
      thead = node;
    } else if (node.type === 'tbody') {
      tbody = node;
    } else if (node.type === 'tfoot') {
      tfoot = node;
    }
  });
  if (!thead || !tbody) {
    throw new Error(
      '<table> in <StickyWrap> must contain both thead and tbody.',
    );
  }
  const columnCount = useMemo(() => {
    const headerRows = Children.toArray(
      thead?.props.children,
    ).pop() as TrWithTh;
    return headerRows.props.children.length;
  }, [thead]);

  const theadRef = useRef<HTMLTableSectionElement>(null);
  const tfootRef = useRef<HTMLTableSectionElement>(null);
  const scrollHeaderRef = useRef<HTMLDivElement>(null);
  const scrollFooterRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const scrollBarSize = getScrollBarSize();
  const { bodyHeight, columnWidths, hasVerticalScroll } = sticky;
  const needSizer =
    !columnWidths ||
    sticky.width !== maxWidth ||
    sticky.height !== maxHeight ||
    sticky.setStickyState !== setStickyState;

  useLayoutEffect(() => {
    if (!theadRef.current) {
      return;
    }
    const bodyThead = theadRef.current;
    const theadHeight = bodyThead.clientHeight;
    const tfootHeight = tfootRef.current ? tfootRef.current.clientHeight : 0;
    if (!theadHeight) {
      return;
    }
    const fullTableHeight = (bodyThead.parentNode as HTMLTableElement)
      .clientHeight;
    const ths = bodyThead.childNodes?.[bodyThead.childNodes?.length - 1 || 0]
      .childNodes as NodeListOf<HTMLTableHeaderCellElement>;
    const widths = Array.from(ths).map(
      th => th.getBoundingClientRect()?.width || th.clientWidth,
    );
    const [hasVerticalScroll, hasHorizontalScroll] = needScrollBar({
      width: maxWidth,
      height: maxHeight - theadHeight - tfootHeight,
      innerHeight: fullTableHeight,
      innerWidth: widths.reduce(sum),
      scrollBarSize,
    });
    const realHeight = Math.min(
      maxHeight,
      hasHorizontalScroll ? fullTableHeight + scrollBarSize : fullTableHeight,
    );
    setStickyState({
      hasVerticalScroll,
      hasHorizontalScroll,
      setStickyState,
      width: maxWidth,
      height: maxHeight,
      realHeight,
      tableHeight: fullTableHeight,
      bodyHeight: realHeight - theadHeight - tfootHeight,
      columnWidths: widths,
    });
  }, [maxWidth, maxHeight, setStickyState, scrollBarSize]);

  let sizerTable: ReactElement | undefined;
  let headerTable: ReactElement | undefined;
  let footerTable: ReactElement | undefined;
  let bodyTable: ReactElement | undefined;

  const scrollBarStyles = css`
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    &::-webkit-scrollbar-track {
      background: ${theme.colorFillQuaternary};
    }
    &::-webkit-scrollbar-thumb {
      background: ${theme.colorFillSecondary};
      border-radius: ${theme.borderRadiusSM}px;
      &:hover {
        background: ${theme.colorFillTertiary};
      }
    }
    &::-webkit-scrollbar-corner {
      background: ${theme.colorFillQuaternary};
    }
  `;

  if (needSizer) {
    const theadWithRef = cloneElement(thead, { ref: theadRef });
    const tfootWithRef = tfoot && cloneElement(tfoot, { ref: tfootRef });
    sizerTable = (
      <div
        key="sizer"
        style={{
          height: maxHeight,
          overflow: 'auto',
          visibility: 'hidden',
          scrollbarGutter: 'stable',
        }}
        css={scrollBarStyles}
        role="presentation"
      >
        {cloneElement(
          table,
          { role: 'presentation' },
          theadWithRef,
          tbody,
          tfootWithRef,
        )}
      </div>
    );
  }

  const colWidths = columnWidths?.slice(0, columnCount);

  if (colWidths && bodyHeight) {
    const colgroup = (
      <colgroup>
        {colWidths.map((w, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <col key={i} width={w} />
        ))}
      </colgroup>
    );

    const headerContainerWidth = hasVerticalScroll
      ? maxWidth - scrollBarSize
      : maxWidth;

    headerTable = (
      <div
        key="header"
        ref={scrollHeaderRef}
        style={{
          overflow: 'hidden',
          width: headerContainerWidth,
          boxSizing: 'border-box',
        }}
        role="presentation"
      >
        {cloneElement(
          cloneElement(table, { role: 'presentation' }),
          mergeStyleProp(table, fixedTableLayout),
          colgroup,
          thead,
        )}
        {headerTable}
      </div>
    );

    footerTable = tfoot && (
      <div
        key="footer"
        ref={scrollFooterRef}
        style={{
          overflow: 'hidden',
          width: headerContainerWidth,
          boxSizing: 'border-box',
        }}
        role="presentation"
      >
        {cloneElement(
          cloneElement(table, { role: 'presentation' }),
          mergeStyleProp(table, fixedTableLayout),
          colgroup,
          tfoot,
        )}
        {footerTable}
      </div>
    );

    const onScroll: UIEventHandler<HTMLDivElement> = e => {
      if (scrollHeaderRef.current) {
        scrollHeaderRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
      if (scrollFooterRef.current) {
        scrollFooterRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
    };
    bodyTable = (
      <div
        key="body"
        ref={scrollBodyRef}
        style={{
          height: bodyHeight,
          overflow: 'auto',
          scrollbarGutter: hasVerticalScroll ? 'stable' : undefined,
          width: maxWidth,
          boxSizing: 'border-box',
        }}
        css={scrollBarStyles}
        onScroll={sticky.hasHorizontalScroll ? onScroll : undefined}
        role="presentation"
      >
        {cloneElement(
          cloneElement(table, { role: 'presentation' }),
          mergeStyleProp(table, fixedTableLayout),
          colgroup,
          tbody,
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: maxWidth,
        height: sticky.realHeight || maxHeight,
        overflow: 'hidden',
      }}
      role="table"
    >
      {headerTable}
      {bodyTable}
      {footerTable}
      {sizerTable}
    </div>
  );
}

/**
 * Standalone hook that provides sticky table functionality.
 * Replaces the v7 plugin-based useSticky.
 */
export default function useSticky({
  data,
  page,
  rows,
  allColumnIds,
  getTableSize = () => undefined,
}: {
  data: unknown[];
  page: unknown[];
  rows: unknown[];
  allColumnIds: string[];
  getTableSize?: GetTableSize;
}): UseStickyInstanceProps & UseStickyState {
  const [sticky, setSticky] = useState<StickyState>({});

  const setStickyState: SetStickyState = useCallback(
    (size?: Partial<StickyState>) => {
      if (!size) return;
      setSticky(prev => ({ ...prev, ...size }));
    },
    // turning pages also triggers a resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getTableSize, page, rows],
  );

  const wrapStickyTable = useCallback(
    (renderer: TableRenderer) => {
      const { width, height }: { width?: number; height?: number } =
        useMountedMemo(getTableSize, [getTableSize]) || sticky;
      // only change of data should trigger re-render
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const table = useMemo(renderer, [page, rows, allColumnIds]);

      useLayoutEffect(() => {
        if (!width || !height) {
          setStickyState();
        }
      }, [width, height]);

      if (!width || !height) {
        return null;
      }
      if (data.length === 0) {
        return table;
      }
      return (
        <StickyWrap
          width={width}
          height={height}
          sticky={sticky}
          setStickyState={setStickyState}
        >
          {table}
        </StickyWrap>
      );
    },
    [sticky, data, page, rows, allColumnIds, getTableSize, setStickyState],
  );

  return {
    wrapStickyTable,
    setStickyState,
    sticky,
  };
}
