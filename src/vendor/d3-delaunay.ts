type Point = { x: number; y: number; index: number };

type Accessor<T> = (point: T) => number;

export class Delaunay<T> {
  private points: Point[];

  private constructor(points: Point[]) {
    this.points = points;
  }

  static from<T>(data: T[], x: Accessor<T>, y: Accessor<T>): Delaunay<T> {
    const points = data.map((item, index) => ({
      x: x(item),
      y: y(item),
      index,
    }));
    return new Delaunay(points);
  }

  find(x: number, y: number): number {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    this.points.forEach((point) => {
      const dx = point.x - x;
      const dy = point.y - y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = point.index;
      }
    });
    return bestIndex;
  }
}
