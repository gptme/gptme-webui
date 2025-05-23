import { observable } from '@legendapp/state';
import type { ImperativePanelHandle } from 'react-resizable-panels';

export const leftSidebarVisible$ = observable(true);
export const rightSidebarVisible$ = observable(true);

let leftPanelRef: ImperativePanelHandle | null = null;
let rightPanelRef: ImperativePanelHandle | null = null;

export const setLeftPanelRef = (ref: ImperativePanelHandle | null) => {
  leftPanelRef = ref;
};

export const setRightPanelRef = (ref: ImperativePanelHandle | null) => {
  rightPanelRef = ref;
};

export const toggleLeftSidebar = () => {
  if (!leftPanelRef) return;
  if (leftPanelRef.isCollapsed()) {
    leftPanelRef.expand();
  } else {
    leftPanelRef.collapse();
  }
};

export const toggleRightSidebar = () => {
  if (!rightPanelRef) return;
  if (rightPanelRef.isCollapsed()) {
    rightPanelRef.expand();
  } else {
    rightPanelRef.collapse();
  }
};
