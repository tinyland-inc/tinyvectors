var d = class {
  cellSize;
  cells;
  blobToCell;
  /**
  * Create a spatial hash
  * @param cellSize - Size of each grid cell (should be ~2x max blob interaction radius)
  */
  constructor(e = 50) {
    this.cellSize = e, this.cells = /* @__PURE__ */ new Map(), this.blobToCell = /* @__PURE__ */ new Map();
  }
  /**
  * Compute cell key from world position
  */
  hash(e, t) {
    return `${Math.floor(e / this.cellSize)},${Math.floor(t / this.cellSize)}`;
  }
  /**
  * Parse cell key back to cell coordinates
  */
  parseKey(e) {
    const [t, l] = e.split(",").map(Number);
    return {
      cellX: t,
      cellY: l
    };
  }
  /**
  * Rebuild the spatial hash with current blob positions
  * Call this once per frame before collision queries
  *
  * @param blobs - All blobs to index
  */
  rebuild(e) {
    this.cells.clear(), this.blobToCell.clear();
    for (const t of e) {
      const l = this.hash(t.currentX, t.currentY);
      this.cells.has(l) || this.cells.set(l, []), this.cells.get(l).push(t), this.blobToCell.set(t, l);
    }
  }
  /**
  * Query all blobs within radius of a position
  *
  * @param x - Query X position
  * @param y - Query Y position
  * @param radius - Search radius
  * @param excludeBlob - Optional blob to exclude from results
  * @returns Array of blobs within radius
  */
  query(e, t, l, y) {
    const n = [], a = Math.ceil(l / this.cellSize), S = l * l, i = Math.floor(e / this.cellSize), u = Math.floor(t / this.cellSize);
    for (let c = -a; c <= a; c++) for (let s = -a; s <= a; s++) {
      const h = `${i + c},${u + s}`, o = this.cells.get(h);
      if (o) for (const r of o) {
        if (r === y) continue;
        const b = r.currentX - e, f = r.currentY - t;
        b * b + f * f < S && n.push(r);
      }
    }
    return n;
  }
  /**
  * Query neighbors of a specific blob
  *
  * @param blob - The blob to find neighbors for
  * @param radius - Search radius
  * @returns Array of neighboring blobs
  */
  queryNeighbors(e, t) {
    return this.query(e.currentX, e.currentY, t, e);
  }
  /**
  * Get all blob pairs within interaction distance
  * Useful for bulk collision processing
  *
  * @param interactionRadius - Maximum interaction distance
  * @returns Array of [blob1, blob2, distance] tuples
  */
  getAllPairs(e) {
    const t = [], l = e * e;
    for (const [y, n] of this.cells) {
      const { cellX: a, cellY: S } = this.parseKey(y);
      for (let i = 0; i < n.length; i++) for (let u = i + 1; u < n.length; u++) {
        const c = n[i], s = n[u], h = s.currentX - c.currentX, o = s.currentY - c.currentY, r = h * h + o * o;
        r < l && t.push([
          c,
          s,
          Math.sqrt(r)
        ]);
      }
      for (const [i, u] of [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1]
      ]) {
        const c = `${a + i},${S + u}`, s = this.cells.get(c);
        if (s) for (const h of n) for (const o of s) {
          const r = o.currentX - h.currentX, b = o.currentY - h.currentY, f = r * r + b * b;
          f < l && t.push([
            h,
            o,
            Math.sqrt(f)
          ]);
        }
      }
    }
    return t;
  }
  /**
  * Get cell size
  */
  getCellSize() {
    return this.cellSize;
  }
  /**
  * Get number of occupied cells (for debugging)
  */
  getCellCount() {
    return this.cells.size;
  }
  /**
  * Get cell contents (for debugging)
  */
  getCell(e, t) {
    const l = this.hash(e, t);
    return this.cells.get(l) || [];
  }
  /**
  * Clear the hash
  */
  clear() {
    this.cells.clear(), this.blobToCell.clear();
  }
};
export {
  d as SpatialHash
};

//# sourceMappingURL=SpatialHash.js.map