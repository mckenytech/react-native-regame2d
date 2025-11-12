import type { AreaComponent, CircleComponent, GameObject, RectComponent, TransformComponent, Vec2 } from '../types';

interface CollisionPair {
  a: GameObject;
  b: GameObject;
}

/**
 * Collision detection system
 * Checks for collisions between objects with area() components
 */
export class CollisionSystem {
  private previousCollisions = new Set<string>();

  /**
   * Update collision detection for all objects
   */
  update(objects: GameObject[]): void {
    const currentCollisions = new Set<string>();
    const objectsWithArea = objects.filter(obj => obj.has('area'));

    // Check all pairs of objects
    for (let i = 0; i < objectsWithArea.length; i++) {
      for (let j = i + 1; j < objectsWithArea.length; j++) {
        const objA = objectsWithArea[i];
        const objB = objectsWithArea[j];

        if (this.shouldSkip(objA, objB)) {
          continue;
        }

        if (this.checkCollision(objA, objB)) {
          const key = this.getCollisionKey(objA, objB);
          currentCollisions.add(key);

          // Resolve physics collision
          this.resolveCollision(objA, objB);

          // Check if this is a new collision
          if (!this.previousCollisions.has(key)) {
            // onCollide - collision started
            this.triggerCollisionStart(objA, objB);
          } else {
            // onCollideUpdate - collision continuing
            this.triggerCollisionUpdate(objA, objB);
          }
        }
      }
    }

    // Check for collisions that ended
    for (const key of this.previousCollisions) {
      if (!currentCollisions.has(key)) {
        const [idA, idB] = key.split(':');
        const objA = objects.find(o => o.id === idA);
        const objB = objects.find(o => o.id === idB);
        if (objA && objB) {
          this.triggerCollisionEnd(objA, objB);
        }
      }
    }

    this.previousCollisions = currentCollisions;
  }

  private shouldSkip(objA: GameObject, objB: GameObject): boolean {
    const areaA = objA.get<AreaComponent>('area');
    const areaB = objB.get<AreaComponent>('area');
    if (!areaA || !areaB) return true;

    const ignoreA = areaA.collisionIgnore ?? [];
    const ignoreB = areaB.collisionIgnore ?? [];

    const matchesIgnoreA = ignoreA.some(tag => objB.hasTag(tag));
    const matchesIgnoreB = ignoreB.some(tag => objA.hasTag(tag));
    return matchesIgnoreA || matchesIgnoreB;
  }

  private checkCollision(objA: GameObject, objB: GameObject): boolean {
    const transformA = objA.get<TransformComponent>('transform');
    const transformB = objB.get<TransformComponent>('transform');
    const areaA = objA.get<AreaComponent>('area');
    const areaB = objB.get<AreaComponent>('area');

    if (!transformA || !transformB || !areaA || !areaB) return false;

    // Auto-detect shape from rect/circle components
    const shapeA = this.getShape(objA, areaA);
    const shapeB = this.getShape(objB, areaB);

    const posA: Vec2 = {
      x: transformA.pos.x.value + (areaA.offset?.x ?? 0),
      y: transformA.pos.y.value + (areaA.offset?.y ?? 0),
    };
    const posB: Vec2 = {
      x: transformB.pos.x.value + (areaB.offset?.x ?? 0),
      y: transformB.pos.y.value + (areaB.offset?.y ?? 0),
    };

    if (shapeA === 'circle' && shapeB === 'circle') {
      return this.circleVsCircle(posA, this.getRadius(objA, areaA), posB, this.getRadius(objB, areaB));
    } else if (shapeA === 'rect' && shapeB === 'rect') {
      return this.rectVsRect(posA, this.getSize(objA, areaA), posB, this.getSize(objB, areaB));
    } else {
      // Circle vs Rect
      const [circle, circlePos, rect, rectPos] = shapeA === 'circle'
        ? [objA, posA, objB, posB]
        : [objB, posB, objA, posA];
      const circleArea = circle.get<AreaComponent>('area')!;
      const rectArea = rect.get<AreaComponent>('area')!;
      return this.circleVsRect(circlePos, this.getRadius(circle, circleArea), rectPos, this.getSize(rect, rectArea));
    }
  }

  private circleVsCircle(posA: Vec2, radiusA: number, posB: Vec2, radiusB: number): boolean {
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const distSq = dx * dx + dy * dy;
    const radiusSum = radiusA + radiusB;
    return distSq <= radiusSum * radiusSum;
  }

  private rectVsRect(posA: Vec2, sizeA: Vec2, posB: Vec2, sizeB: Vec2): boolean {
    return (
      posA.x - sizeA.x / 2 < posB.x + sizeB.x / 2 &&
      posA.x + sizeA.x / 2 > posB.x - sizeB.x / 2 &&
      posA.y - sizeA.y / 2 < posB.y + sizeB.y / 2 &&
      posA.y + sizeA.y / 2 > posB.y - sizeB.y / 2
    );
  }

  private circleVsRect(circlePos: Vec2, radius: number, rectPos: Vec2, size: Vec2): boolean {
    // Find closest point on rect to circle
    const closestX = Math.max(rectPos.x - size.x / 2, Math.min(circlePos.x, rectPos.x + size.x / 2));
    const closestY = Math.max(rectPos.y - size.y / 2, Math.min(circlePos.y, rectPos.y + size.y / 2));

    const dx = circlePos.x - closestX;
    const dy = circlePos.y - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  private getShape(obj: GameObject, area: AreaComponent): 'rect' | 'circle' {
    if (area.shape) return area.shape;
    if (obj.has('circle')) return 'circle';
    return 'rect';
  }

  private getRadius(obj: GameObject, area: AreaComponent): number {
    const scale = area.scale ?? { x: 1, y: 1 };
    const scaleFactor = Math.max(scale.x, scale.y);
    if (area.radius !== undefined) return area.radius * scaleFactor;
    const circle = obj.get<CircleComponent>('circle');
    return circle ? circle.radius * scaleFactor : 0;
  }

  private getSize(obj: GameObject, area: AreaComponent): Vec2 {
    const scale = area.scale ?? { x: 1, y: 1 };
    if (area.width !== undefined && area.height !== undefined) {
      return { x: area.width * scale.x, y: area.height * scale.y };
    }
    const rect = obj.get<RectComponent>('rect');
    return rect ? { x: rect.width * scale.x, y: rect.height * scale.y } : { x: 0, y: 0 };
  }

  private getCollisionKey(objA: GameObject, objB: GameObject): string {
    const [id1, id2] = [objA.id, objB.id].sort();
    return `${id1}:${id2}`;
  }

  private triggerCollisionStart(objA: GameObject, objB: GameObject): void {
    this.triggerCallbacks(objA, objB, 'onCollide');
    this.triggerCallbacks(objB, objA, 'onCollide');
  }

  private triggerCollisionUpdate(objA: GameObject, objB: GameObject): void {
    this.triggerCallbacks(objA, objB, 'onCollideUpdate');
    this.triggerCallbacks(objB, objA, 'onCollideUpdate');
  }

  private triggerCollisionEnd(objA: GameObject, objB: GameObject): void {
    this.triggerCallbacks(objA, objB, 'onCollideEnd');
    this.triggerCallbacks(objB, objA, 'onCollideEnd');
  }

  private triggerCallbacks(obj: GameObject, other: GameObject, eventType: string): void {
    const callbacks = (obj as any)[`_${eventType}Callbacks`] as Map<string, Function[]> | undefined;
    if (!callbacks) return;

    // Trigger callbacks for specific tags
    for (const tag of other.tags) {
      const tagCallbacks = callbacks.get(tag);
      if (tagCallbacks) {
        for (const callback of tagCallbacks) {
          callback(other);
        }
      }
    }

    // Trigger callbacks for wildcard '*'
    const wildcardCallbacks = callbacks.get('*');
    if (wildcardCallbacks) {
      for (const callback of wildcardCallbacks) {
        callback(other);
      }
    }
  }

  /**
   * Resolve collision physics (separate objects and adjust velocities)
   */
  private resolveCollision(objA: GameObject, objB: GameObject): void {
    const bodyA = objA.get<any>('body');
    const bodyB = objB.get<any>('body');

    // Only resolve physics if both objects have bodies
    if (!bodyA || !bodyB) return;
    
    // Don't resolve if both are static
    if (bodyA.isStatic && bodyB.isStatic) return;
    
    // Skip if neither has physics enabled (both static with no velocity)
    if (bodyA.isStatic && bodyB.isStatic) return;

    const transformA = objA.get<any>('transform');
    const transformB = objB.get<any>('transform');
    
    if (!transformA || !transformB) return;

    // Calculate collision normal and separation
    const posA = { x: transformA.pos.x.value, y: transformA.pos.y.value };
    const posB = { x: transformB.pos.x.value, y: transformB.pos.y.value };

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return; // Objects are at exact same position

    // Normalized collision normal
    const nx = dx / distance;
    const ny = dy / distance;

    // Determine masses
    const massA = bodyA?.mass ?? (bodyA?.isStatic ? Infinity : 1);
    const massB = bodyB?.mass ?? (bodyB?.isStatic ? Infinity : 1);

    const isStaticA = bodyA?.isStatic ?? false;
    const isStaticB = bodyB?.isStatic ?? false;

    // Calculate overlap and separate objects
    const areaA = objA.get<AreaComponent>('area');
    const areaB = objB.get<AreaComponent>('area');
    
    if (areaA && areaB) {
      const shapeA = this.getShape(objA, areaA);
      const shapeB = this.getShape(objB, areaB);
      
      let overlap = 0;
      
      if (shapeA === 'circle' && shapeB === 'circle') {
        const radiusA = this.getRadius(objA, areaA);
        const radiusB = this.getRadius(objB, areaB);
        overlap = (radiusA + radiusB) - distance;
      } else if (shapeA === 'rect' && shapeB === 'rect') {
        // Simple AABB separation
        const sizeA = this.getSize(objA, areaA);
        const sizeB = this.getSize(objB, areaB);
        const overlapX = (sizeA.x + sizeB.x) / 2 - Math.abs(dx);
        const overlapY = (sizeA.y + sizeB.y) / 2 - Math.abs(dy);
        overlap = Math.min(overlapX, overlapY);
      } else {
        // Circle vs rect - approximate
        overlap = 10; // Default separation
      }

      if (overlap > 0) {
        if (!isStaticA && !isStaticB) {
          // Both dynamic objects - use minimal separation to prevent jitter
          const separation = overlap * 0.51; // Just barely separate them
          const totalMass = massA + massB;
          const ratioA = massB / totalMass;
          const ratioB = massA / totalMass;

          transformA.pos.x.value -= nx * separation * ratioA;
          transformA.pos.y.value -= ny * separation * ratioA;
          transformB.pos.x.value += nx * separation * ratioB;
          transformB.pos.y.value += ny * separation * ratioB;
        } else if (!isStaticA) {
          // Dynamic vs Static - push out completely
          transformA.pos.x.value -= nx * (overlap + 1);
          transformA.pos.y.value -= ny * (overlap + 1);
        } else if (!isStaticB) {
          // Dynamic vs Static - push out completely
          transformB.pos.x.value += nx * (overlap + 1);
          transformB.pos.y.value += ny * (overlap + 1);
        }
      }
    }

    // Apply velocity response (elastic collision)
    if (bodyA && bodyB && !isStaticA && !isStaticB) {
      const vRelativeX = bodyA.velocity.x - bodyB.velocity.x;
      const vRelativeY = bodyA.velocity.y - bodyB.velocity.y;
      
      const velocityAlongNormal = vRelativeX * nx + vRelativeY * ny;
      
      // Only apply impulse if objects are moving towards each other
      if (velocityAlongNormal >= 0) return; // Objects moving apart or stationary
      
      // Low restitution for smooth collisions between dynamic objects
      const restitution = this.getRestitution(areaA, areaB, 0.3);
      const impulse = -(1 + restitution) * velocityAlongNormal / (1/massA + 1/massB);
      
      bodyA.velocity.x += impulse * nx / massA;
      bodyA.velocity.y += impulse * ny / massA;
      bodyB.velocity.x -= impulse * nx / massB;
      bodyB.velocity.y -= impulse * ny / massB;

      this.applyFriction(bodyA, bodyB, nx, ny, massA, massB, areaA, areaB);
    } else if (bodyA && !isStaticA && isStaticB) {
      // A bounces off static B
      const vRelativeX = bodyA.velocity.x;
      const vRelativeY = bodyA.velocity.y;
      const velocityAlongNormal = vRelativeX * nx + vRelativeY * ny;
      
      if (velocityAlongNormal < 0) {
        // Reflect velocity with good bounce
        const restitution = this.getRestitution(areaA, areaB, 0.8);
        bodyA.velocity.x -= (1 + restitution) * velocityAlongNormal * nx;
        bodyA.velocity.y -= (1 + restitution) * velocityAlongNormal * ny;
        this.applySingleBodyFriction(bodyA, nx, ny, areaA, areaB);
      }
    } else if (bodyB && !isStaticB && isStaticA) {
      // B bounces off static A
      const vRelativeX = bodyB.velocity.x;
      const vRelativeY = bodyB.velocity.y;
      const velocityAlongNormal = vRelativeX * (-nx) + vRelativeY * (-ny);
      
      if (velocityAlongNormal < 0) {
        const restitution = this.getRestitution(areaA, areaB, 0.8);
        bodyB.velocity.x -= (1 + restitution) * velocityAlongNormal * (-nx);
        bodyB.velocity.y -= (1 + restitution) * velocityAlongNormal * (-ny);
        this.applySingleBodyFriction(bodyB, -nx, -ny, areaA, areaB);
      }
    }
  }

  private getRestitution(areaA?: AreaComponent, areaB?: AreaComponent, fallback = 0.3): number {
    const values = [];
    if (areaA?.restitution !== undefined) values.push(areaA.restitution);
    if (areaB?.restitution !== undefined) values.push(areaB.restitution);
    if (values.length === 0) return fallback;
    return Math.max(0, Math.min(1, Math.max(...values)));
  }

  private getFriction(areaA?: AreaComponent, areaB?: AreaComponent): number {
    const values = [];
    if (areaA?.friction !== undefined) values.push(areaA.friction);
    if (areaB?.friction !== undefined) values.push(areaB.friction);
    if (values.length === 0) return 1;
    const avg = values.reduce((acc, val) => acc + val, 0) / values.length;
    return Math.max(0, Math.min(1, avg));
  }

  private applyFriction(
    bodyA: any,
    bodyB: any,
    nx: number,
    ny: number,
    massA: number,
    massB: number,
    areaA?: AreaComponent,
    areaB?: AreaComponent,
  ): void {
    const friction = this.getFriction(areaA, areaB);
    if (friction >= 1) return;

    const vRelativeX = bodyA.velocity.x - bodyB.velocity.x;
    const vRelativeY = bodyA.velocity.y - bodyB.velocity.y;

    const velocityAlongNormal = vRelativeX * nx + vRelativeY * ny;
    const tangentX = vRelativeX - velocityAlongNormal * nx;
    const tangentY = vRelativeY - velocityAlongNormal * ny;

    bodyA.velocity.x -= tangentX * (1 - friction) / massA;
    bodyA.velocity.y -= tangentY * (1 - friction) / massA;
    bodyB.velocity.x += tangentX * (1 - friction) / massB;
    bodyB.velocity.y += tangentY * (1 - friction) / massB;
  }

  private applySingleBodyFriction(
    body: any,
    nx: number,
    ny: number,
    areaA?: AreaComponent,
    areaB?: AreaComponent,
  ): void {
    const friction = this.getFriction(areaA, areaB);
    if (friction >= 1) return;

    const velocityAlongNormal = body.velocity.x * nx + body.velocity.y * ny;
    const tangentX = body.velocity.x - velocityAlongNormal * nx;
    const tangentY = body.velocity.y - velocityAlongNormal * ny;

    body.velocity.x = nx * velocityAlongNormal + tangentX * friction;
    body.velocity.y = ny * velocityAlongNormal + tangentY * friction;
  }

  reset(): void {
    this.previousCollisions.clear();
  }
}

