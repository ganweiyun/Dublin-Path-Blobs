
import { Point, Rotation, TangentInfo } from '../types';

export const getTangent = (
  c1: Point,
  c2: Point,
  r1: number,
  r2: number,
  rot1: Rotation,
  rot2: Rotation
): TangentInfo | null => {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const baseAngle = Math.atan2(dy, dx);

  if (rot1 === rot2) {
    // Outer Tangents (different radii)
    if (dist < Math.abs(r1 - r2)) return null;
    
    const angleOffset = Math.acos((r1 - r2) / dist);
    const angle = rot1 === Rotation.CW ? baseAngle - angleOffset : baseAngle + angleOffset;
    
    return {
      start: {
        x: c1.x + r1 * Math.cos(angle),
        y: c1.y + r1 * Math.sin(angle)
      },
      end: {
        x: c2.x + r2 * Math.cos(angle),
        y: c2.y + r2 * Math.sin(angle)
      },
      startAngle: angle,
      endAngle: angle
    };
  } else {
    // Inner Tangents (different radii)
    if (dist < r1 + r2) return null;

    const angleOffset = Math.acos((r1 + r2) / dist);
    const startAngle = rot1 === Rotation.CW ? baseAngle - angleOffset : baseAngle + angleOffset;
    const endAngle = startAngle + Math.PI;

    return {
      start: {
        x: c1.x + r1 * Math.cos(startAngle),
        y: c1.y + r1 * Math.sin(startAngle)
      },
      end: {
        x: c2.x + r2 * Math.cos(endAngle),
        y: c2.y + r2 * Math.sin(endAngle)
      },
      startAngle,
      endAngle
    };
  }
};

export const normalizeAngle = (angle: number): number => {
  while (angle <= -Math.PI) angle += 2 * Math.PI;
  while (angle > Math.PI) angle -= 2 * Math.PI;
  return angle;
};

export const getArcSweep = (start: number, end: number, rot: Rotation): number => {
  let diff = end - start;
  if (rot === Rotation.CW) {
    while (diff < 0) diff += 2 * Math.PI;
  } else {
    while (diff > 0) diff -= 2 * Math.PI;
  }
  return diff;
};

/**
 * Calculates the square of the distance from point p to the line segment ab.
 */
export const distToSegmentSq = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.x - (a.x + t * dx)) ** 2 + (p.y - (a.y + t * dy)) ** 2;
};
