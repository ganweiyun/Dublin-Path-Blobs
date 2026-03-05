
export enum Rotation {
  CW = 'CW',
  CCW = 'CCW'
}

export interface Node {
  id: string;
  gridX: number;
  gridY: number;
  rotation: Rotation;
  isSharp?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface TangentInfo {
  start: Point;
  end: Point;
  startAngle: number;
  endAngle: number;
}

export interface PathSegment {
  type: 'arc' | 'line';
  center?: Point;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  rotation?: Rotation;
  p1?: Point;
  p2?: Point;
}
