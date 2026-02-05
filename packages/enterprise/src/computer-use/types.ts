/**
 * Computer Use Types
 */

export type ActionType = 
  | 'click' 
  | 'double_click'
  | 'right_click'
  | 'type' 
  | 'key' 
  | 'scroll' 
  | 'move'
  | 'drag'
  | 'screenshot'
  | 'wait'
  | 'done';

export interface ClickAction {
  action: 'click' | 'double_click' | 'right_click';
  x: number;
  y: number;
  button?: 'left' | 'right' | 'middle';
}

export interface TypeAction {
  action: 'type';
  text: string;
}

export interface KeyAction {
  action: 'key';
  key: string; // 'return', 'tab', 'cmd+s', etc.
}

export interface ScrollAction {
  action: 'scroll';
  x: number;
  y: number;
  direction: 'up' | 'down';
  amount?: number;
}

export interface MoveAction {
  action: 'move';
  x: number;
  y: number;
}

export interface DragAction {
  action: 'drag';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface ScreenshotAction {
  action: 'screenshot';
}

export interface WaitAction {
  action: 'wait';
  ms: number;
}

export interface DoneAction {
  action: 'done';
  reason: string;
}

export type ComputerAction = 
  | ClickAction 
  | TypeAction 
  | KeyAction 
  | ScrollAction 
  | MoveAction
  | DragAction
  | ScreenshotAction
  | WaitAction
  | DoneAction;

export interface AgentConfig {
  maxSteps?: number;
  apiKey?: string;
  model?: string;
  screenWidth?: number;
  screenHeight?: number;
  debug?: boolean;
  onStep?: (step: number, action: ComputerAction) => void;
  onScreenshot?: (base64: string) => void;
}

export interface AgentResult {
  success: boolean;
  steps: number;
  actions: ComputerAction[];
  error?: string;
  finalReason?: string;
}

/**
 * Anthropic Computer Use Tool Definitions
 * These match the Anthropic API format for computer use tools
 */
export const ANTHROPIC_COMPUTER_TOOLS = [
  {
    type: "computer_20241022",
    name: "computer",
    display_width_px: 2560,
    display_height_px: 1440,
    display_number: 0,
  },
  {
    type: "bash_20241022",
    name: "bash",
  },
  {
    type: "text_editor_20241022",
    name: "str_replace_editor",
  },
];
