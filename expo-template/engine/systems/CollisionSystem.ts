import type {
  AreaComponent,
  BodyComponent,
  CircleComponent,
  GameObject,
  RectComponent,
  SpriteComponent,
  TransformComponent,
  Vec2,
} from '../types';

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

    const rotationA = transformA.rotation ?? 0;
    const rotationB = transformB.rotation ?? 0;

    if (shapeA === 'circle' && shapeB === 'circle') {
      return this.circleVsCircle(posA, this.getRadius(objA, areaA), posB, this.getRadius(objB, areaB));
    } else if (shapeA === 'rect' && shapeB === 'rect') {
      // Check if either object is rotated
      if (rotationA !== 0 || rotationB !== 0) {
        const result = this.rotatedRectVsRotatedRect(posA, this.getSize(objA, areaA), rotationA, posB, this.getSize(objB, areaB), rotationB);
        return result !== null;
      } else {
        return this.rectVsRect(posA, this.getSize(objA, areaA), posB, this.getSize(objB, areaB));
      }
    } else {
      // Circle vs Rect
      const [circle, circlePos, rect, rectPos, rectTransform] = shapeA === 'circle'
        ? [objA, posA, objB, posB, transformB]
        : [objB, posB, objA, posA, transformA];
      const circleArea = circle.get<AreaComponent>('area')!;
      const rectArea = rect.get<AreaComponent>('area')!;
      const rectRotation = rectTransform.rotation ?? 0;
      return this.circleVsRect(circlePos, this.getRadius(circle, circleArea), rectPos, this.getSize(rect, rectArea), rectRotation);
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
    // sizeA and sizeB are full widths/heights, convert to half-extents
    const halfWidthA = sizeA.x / 2;
    const halfHeightA = sizeA.y / 2;
    const halfWidthB = sizeB.x / 2;
    const halfHeightB = sizeB.y / 2;
    
    return (
      posA.x - halfWidthA < posB.x + halfWidthB &&
      posA.x + halfWidthA > posB.x - halfWidthB &&
      posA.y - halfHeightA < posB.y + halfHeightB &&
      posA.y + halfHeightA > posB.y - halfHeightB
    );
  }

  private circleVsRect(circlePos: Vec2, radius: number, rectPos: Vec2, size: Vec2, rotation: number = 0): boolean {
    if (rotation === 0) {
      // size is full width/height, convert to half-extents
      const halfWidth = size.x / 2;
      const halfHeight = size.y / 2;
      
      // Find closest point on rect to circle
      const closestX = Math.max(rectPos.x - halfWidth, Math.min(circlePos.x, rectPos.x + halfWidth));
      const closestY = Math.max(rectPos.y - halfHeight, Math.min(circlePos.y, rectPos.y + halfHeight));

      const dx = circlePos.x - closestX;
      const dy = circlePos.y - closestY;
      return dx * dx + dy * dy <= radius * radius;
    } else {
      // Rotate circle into rect's local space
      const angleRad = (rotation * Math.PI) / 180;
      const cos = Math.cos(-angleRad);
      const sin = Math.sin(-angleRad);
      
      // Translate to rect's origin
      const dx = circlePos.x - rectPos.x;
      const dy = circlePos.y - rectPos.y;
      
      // Rotate
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      
      // Now do axis-aligned test
      const halfWidth = size.x / 2;
      const halfHeight = size.y / 2;
      
      const closestX = Math.max(-halfWidth, Math.min(localX, halfWidth));
      const closestY = Math.max(-halfHeight, Math.min(localY, halfHeight));
      
      const distX = localX - closestX;
      const distY = localY - closestY;
      return distX * distX + distY * distY <= radius * radius;
    }
  }

  /**
   * Rotated rectangle vs rotated rectangle collision using SAT (Separating Axis Theorem)
   * Returns collision info with normal and overlap, or null if no collision
   */
  private rotatedRectVsRotatedRect(
    posA: Vec2,
    sizeA: Vec2,
    rotationA: number,
    posB: Vec2,
    sizeB: Vec2,
    rotationB: number
  ): { normal: Vec2; overlap: number } | null {
    // Convert to radians
    const angleA = (rotationA * Math.PI) / 180;
    const angleB = (rotationB * Math.PI) / 180;
    
    // Get corners for both rectangles
    const cornersA = this.getRectCorners(posA, sizeA, angleA);
    const cornersB = this.getRectCorners(posB, sizeB, angleB);
    
    // Get axes to test (perpendicular to each edge)
    const axesA = this.getRectAxes(angleA);
    const axesB = this.getRectAxes(angleB);
    
    let minOverlap = Number.MAX_VALUE;
    let collisionNormal: Vec2 = { x: 1, y: 0 };
    
    // Test all axes
    for (const axis of [...axesA, ...axesB]) {
      const result = this.overlapOnAxisWithDistance(cornersA, cornersB, axis);
      if (!result.overlaps) {
        return null; // Found separating axis - no collision
      }
      
      // Track the axis with minimum overlap (that's our collision normal)
      if (result.overlap < minOverlap) {
        minOverlap = result.overlap;
        collisionNormal = { x: axis.x, y: axis.y };
      }
    }
    
    // Make sure normal points from A to B
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const dot = collisionNormal.x * dx + collisionNormal.y * dy;
    if (dot < 0) {
      collisionNormal.x = -collisionNormal.x;
      collisionNormal.y = -collisionNormal.y;
    }
    
    return { normal: collisionNormal, overlap: minOverlap };
  }

  private getRectCorners(pos: Vec2, size: Vec2, angleRad: number): Vec2[] {
    const halfWidth = size.x / 2;
    const halfHeight = size.y / 2;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    
    // Local corners (before rotation)
    const localCorners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ];
    
    // Rotate and translate
    return localCorners.map(corner => ({
      x: pos.x + (corner.x * cos - corner.y * sin),
      y: pos.y + (corner.x * sin + corner.y * cos),
    }));
  }

  private getRectAxes(angleRad: number): Vec2[] {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    
    return [
      { x: cos, y: sin },           // Axis along width
      { x: -sin, y: cos },          // Axis along height
    ];
  }

  private overlapOnAxis(cornersA: Vec2[], cornersB: Vec2[], axis: Vec2): boolean {
    const result = this.overlapOnAxisWithDistance(cornersA, cornersB, axis);
    return result.overlaps;
  }

  private overlapOnAxisWithDistance(cornersA: Vec2[], cornersB: Vec2[], axis: Vec2): { overlaps: boolean; overlap: number } {
    // Project all corners onto axis
    const projectionsA = cornersA.map(corner => corner.x * axis.x + corner.y * axis.y);
    const projectionsB = cornersB.map(corner => corner.x * axis.x + corner.y * axis.y);
    
    const minA = Math.min(...projectionsA);
    const maxA = Math.max(...projectionsA);
    const minB = Math.min(...projectionsB);
    const maxB = Math.max(...projectionsB);
    
    // Check if projections overlap
    const overlaps = !(maxA < minB || maxB < minA);
    if (!overlaps) {
      return { overlaps: false, overlap: 0 };
    }
    
    // Calculate overlap distance
    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    return { overlaps: true, overlap: Math.abs(overlap) };
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
    // If area has explicit dimensions, use those
    if (area.width !== undefined && area.height !== undefined) {
      return { x: area.width * scale.x, y: area.height * scale.y };
    }
    // Otherwise, auto-detect from rect/sprite/circle components
    const rect = obj.get<RectComponent>('rect');
    if (rect) {
      return { x: rect.width * scale.x, y: rect.height * scale.y };
    }
    const sprite = obj.get<SpriteComponent>('sprite');
    if (sprite) {
      return { x: sprite.width * scale.x, y: sprite.height * scale.y };
    }
    const circle = obj.get<CircleComponent>('circle');
    if (circle) {
      const radius = circle.radius * Math.max(scale.x, scale.y);
      return { x: radius * 2, y: radius * 2 };
    }
    return { x: 0, y: 0 };
  }

  private getCollisionKey(objA: GameObject, objB: GameObject): string {
    const [id1, id2] = [objA.id, objB.id].sort();
    return `${id1}:${id2}`;
  }

  private triggerCollisionStart(objA: GameObject, objB: GameObject): void {
    this.triggerCallbacks(objA, objB, 'onCollide');
    this.triggerCallbacks(objB, objA, 'onCollide');
    (objA as any).trigger?.('collide', objB);
    (objB as any).trigger?.('collide', objA);
  }

  private triggerCollisionUpdate(objA: GameObject, objB: GameObject): void {
    this.triggerCallbacks(objA, objB, 'onCollideUpdate');
    this.triggerCallbacks(objB, objA, 'onCollideUpdate');
    (objA as any).trigger?.('collideUpdate', objB);
    (objB as any).trigger?.('collideUpdate', objA);
  }

  private triggerCollisionEnd(objA: GameObject, objB: GameObject): void {
    this.triggerCallbacks(objA, objB, 'onCollideEnd');
    this.triggerCallbacks(objB, objA, 'onCollideEnd');
    (objA as any).trigger?.('collideEnd', objB);
    (objB as any).trigger?.('collideEnd', objA);
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
    const bodyA = objA.get<BodyComponent>('body');
    const bodyB = objB.get<BodyComponent>('body');

    // Only resolve physics if both objects have bodies
    if (!bodyA || !bodyB) return;
    
    // Don't resolve if both are static
    if (bodyA.isStatic && bodyB.isStatic) return;
    
    // Skip if neither has physics enabled (both static with no velocity)
    if (bodyA.isStatic && bodyB.isStatic) return;

    const transformA = objA.get<TransformComponent>('transform');
    const transformB = objB.get<TransformComponent>('transform');
    
    if (!transformA || !transformB) return;

    // Get area components to apply offset (must match checkCollision logic)
    const areaA = objA.get<AreaComponent>('area');
    const areaB = objB.get<AreaComponent>('area');
    
    // Calculate collision normal and separation
    // IMPORTANT: Use the same offset logic as checkCollision!
    const posA = {
      x: transformA.pos.x.value + (areaA?.offset?.x ?? 0),
      y: transformA.pos.y.value + (areaA?.offset?.y ?? 0),
    };
    const posB = {
      x: transformB.pos.x.value + (areaB?.offset?.x ?? 0),
      y: transformB.pos.y.value + (areaB?.offset?.y ?? 0),
    };

    // Calculate collision normal
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let nx: number;
    let ny: number;
    const rotationA = transformA.rotation ?? 0;
    const rotationB = transformB.rotation ?? 0;
    const shapeA = this.getShape(objA, areaA);
    const shapeB = this.getShape(objB, areaB);
    
    // Store SAT result for later use
    let satCollisionInfo: { normal: Vec2; overlap: number } | null = null;
    
    // For rotated rectangles, use SAT to get the proper collision normal
    if (shapeA === 'rect' && shapeB === 'rect' && (rotationA !== 0 || rotationB !== 0)) {
      satCollisionInfo = this.rotatedRectVsRotatedRect(
        posA,
        this.getSize(objA, areaA),
        rotationA,
        posB,
        this.getSize(objB, areaB),
        rotationB
      );
      
      if (satCollisionInfo) {
        nx = satCollisionInfo.normal.x;
        ny = satCollisionInfo.normal.y;
      } else {
        return; // No collision
      }
    } else {
      // For axis-aligned or circle collisions, use center-to-center normal
      if (distance === 0) return; // Objects are at exact same position

      nx = dx / distance;
      ny = dy / distance;
    }

    // Determine masses
    const massA = bodyA?.mass ?? (bodyA?.isStatic ? Infinity : 1);
    const massB = bodyB?.mass ?? (bodyB?.isStatic ? Infinity : 1);

    const isStaticA = bodyA?.isStatic ?? false;
    const isStaticB = bodyB?.isStatic ?? false;

    // Calculate overlap and separate objects
    // Note: areaA and areaB are already declared above for offset calculation
    if (areaA && areaB) {
      const shapeA = this.getShape(objA, areaA);
      const shapeB = this.getShape(objB, areaB);
      
      const rotationA = transformA.rotation ?? 0;
      const rotationB = transformB.rotation ?? 0;
      
      let overlap = 0;
      
      if (shapeA === 'circle' && shapeB === 'circle') {
        const radiusA = this.getRadius(objA, areaA);
        const radiusB = this.getRadius(objB, areaB);
        overlap = (radiusA + radiusB) - distance;
      } else if (shapeA === 'rect' && shapeB === 'rect') {
        // Check if either object is rotated
        if (rotationA !== 0 || rotationB !== 0) {
          // For rotated rectangles, use the overlap from SAT
          if (satCollisionInfo) {
            overlap = satCollisionInfo.overlap;
          } else {
            overlap = 0; // Shouldn't happen, but fallback
          }
        } else {
          // Simple AABB separation
          // getSize returns full widths/heights, convert to half-extents
          const sizeA = this.getSize(objA, areaA);
          const sizeB = this.getSize(objB, areaB);
          const halfWidthA = sizeA.x / 2;
          const halfHeightA = sizeA.y / 2;
          const halfWidthB = sizeB.x / 2;
          const halfHeightB = sizeB.y / 2;
          
          const overlapX = (halfWidthA + halfWidthB) - Math.abs(dx);
          const overlapY = (halfHeightA + halfHeightB) - Math.abs(dy);
          overlap = Math.min(overlapX, overlapY);
        }
      } else {
        // Circle vs rect - approximate
        overlap = 10; // Default separation
      }

      if (overlap > 0) {
        // For rotated objects using SAT, we have accurate overlap so need less extra separation
        const rotationA = transformA.rotation ?? 0;
        const rotationB = transformB.rotation ?? 0;
        const isRotated = rotationA !== 0 || rotationB !== 0;
        const extraSeparation = isRotated ? 0.5 : 1; // Less push for rotated objects since SAT is accurate
        
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
          transformA.pos.x.value -= nx * (overlap + extraSeparation);
          transformA.pos.y.value -= ny * (overlap + extraSeparation);
        } else if (!isStaticB) {
          // Dynamic vs Static - push out completely
          transformB.pos.x.value += nx * (overlap + extraSeparation);
          transformB.pos.y.value += ny * (overlap + extraSeparation);
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
      // A collides with static B
      const vRelativeX = bodyA.velocity.x;
      const vRelativeY = bodyA.velocity.y;
      const velocityAlongNormal = vRelativeX * nx + vRelativeY * ny;
      
      if (velocityAlongNormal < 0) {
        // Check if either object is rotated
        const rotationA = transformA.rotation ?? 0;
        const rotationB = transformB.rotation ?? 0;
        const isRotated = rotationA !== 0 || rotationB !== 0;
        
        if (isRotated) {
          // For rotated objects: just stop the velocity component along the collision normal
          bodyA.velocity.x -= velocityAlongNormal * nx;
          bodyA.velocity.y -= velocityAlongNormal * ny;
          // Apply strong friction to stop sliding
          this.applySingleBodyFriction(bodyA, nx, ny, areaA, areaB);
        } else {
          // For axis-aligned objects: allow bouncing
          const restitution = this.getRestitution(areaA, areaB, 0.8);
          bodyA.velocity.x -= (1 + restitution) * velocityAlongNormal * nx;
          bodyA.velocity.y -= (1 + restitution) * velocityAlongNormal * ny;
          this.applySingleBodyFriction(bodyA, nx, ny, areaA, areaB);
        }
      }
    } else if (bodyB && !isStaticB && isStaticA) {
      // B collides with static A
      const vRelativeX = bodyB.velocity.x;
      const vRelativeY = bodyB.velocity.y;
      const velocityAlongNormal = vRelativeX * (-nx) + vRelativeY * (-ny);
      
      if (velocityAlongNormal < 0) {
        // Check if either object is rotated
        const rotationA = transformA.rotation ?? 0;
        const rotationB = transformB.rotation ?? 0;
        const isRotated = rotationA !== 0 || rotationB !== 0;
        
        if (isRotated) {
          // For rotated objects: just stop the velocity component along the collision normal
          bodyB.velocity.x -= velocityAlongNormal * (-nx);
          bodyB.velocity.y -= velocityAlongNormal * (-ny);
          // Apply strong friction to stop sliding
          this.applySingleBodyFriction(bodyB, -nx, -ny, areaA, areaB);
        } else {
          // For axis-aligned objects: allow bouncing
          const restitution = this.getRestitution(areaA, areaB, 0.8);
          bodyB.velocity.x -= (1 + restitution) * velocityAlongNormal * (-nx);
          bodyB.velocity.y -= (1 + restitution) * velocityAlongNormal * (-ny);
          this.applySingleBodyFriction(bodyB, -nx, -ny, areaA, areaB);
        }
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
    const friction = Math.max(0, Math.min(1, this.getFriction(areaA, areaB)));
    if (friction <= 0) return;

    const vRelativeX = bodyA.velocity.x - bodyB.velocity.x;
    const vRelativeY = bodyA.velocity.y - bodyB.velocity.y;

    const velocityAlongNormal = vRelativeX * nx + vRelativeY * ny;
    const tangentX = vRelativeX - velocityAlongNormal * nx;
    const tangentY = vRelativeY - velocityAlongNormal * ny;

    const invMassA = massA === Infinity ? 0 : 1 / massA;
    const invMassB = massB === Infinity ? 0 : 1 / massB;

    bodyA.velocity.x -= tangentX * friction * invMassA;
    bodyA.velocity.y -= tangentY * friction * invMassA;
    bodyB.velocity.x += tangentX * friction * invMassB;
    bodyB.velocity.y += tangentY * friction * invMassB;
  }

  private applySingleBodyFriction(
    body: any,
    nx: number,
    ny: number,
    areaA?: AreaComponent,
    areaB?: AreaComponent,
  ): void {
    const friction = Math.max(0, Math.min(1, this.getFriction(areaA, areaB)));
    if (friction <= 0) return;

    const velocityAlongNormal = body.velocity.x * nx + body.velocity.y * ny;
    const tangentX = body.velocity.x - velocityAlongNormal * nx;
    const tangentY = body.velocity.y - velocityAlongNormal * ny;

    const tangentMultiplier = Math.max(0, 1 - friction);

    body.velocity.x = nx * velocityAlongNormal + tangentX * tangentMultiplier;
    body.velocity.y = ny * velocityAlongNormal + tangentY * tangentMultiplier;

    if (Math.abs(body.velocity.x) < 1e-4) body.velocity.x = 0;
    if (Math.abs(body.velocity.y) < 1e-4) body.velocity.y = 0;
  }

  reset(): void {
    this.previousCollisions.clear();
  }
}

