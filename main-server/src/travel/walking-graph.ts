/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { METRES_PER_DEGREE, metresPerDegreeEast, type Position } from '../common/geometry.js';

// The walking model of ADR 0010: OpenStreetMap's paths as a graph, each pin joined to it, and the walk's seconds. Only
// the offline builder runs this; the server looks the results up.

const WALKING_METRES_PER_SECOND = 1.1;
// 0.5 minutes per 10 m, only when the destination is higher.
const CLIMB_SECONDS_PER_METRE = 3;
const JOIN_MARGIN_METRES = 20;

const WALKED_HIGHWAYS = new Set([
  'footway',
  'path',
  'steps',
  'pedestrian',
  'living_street',
  'service',
  'residential',
  'unclassified',
  'tertiary',
  'secondary',
  'track',
]);

export interface OsmWay {
  nodes: number[];
  geometry: { lat: number; lon: number }[];
  tags: Record<string, string>;
}

// A Place or a Shuttle Stop, with its one elevation in metres.
export interface Pin extends Position {
  elevation: number;
}

interface PlanePoint {
  x: number;
  y: number;
}

interface Segment {
  fromNode: number;
  toNode: number;
  from: PlanePoint;
  to: PlanePoint;
  metres: number;
}

export interface WalkingGraph {
  neighbours: { node: number; metres: number }[][];
  // The segments a pin may join.
  joinable: Segment[];
}

interface Join {
  segment: Segment;
  // From the pin to the segment, in a straight line.
  connector: number;
  // Along the segment from its first node.
  along: number;
}

// One projection for the whole campus. The campus spans 2.5 km, over which a degree of longitude hardly changes.
const EAST = metresPerDegreeEast(37.458);

function onPlane({ latitude, longitude }: Position): PlanePoint {
  return { x: longitude * EAST, y: latitude * METRES_PER_DEGREE };
}

function walkable({ highway, foot, access }: Record<string, string>): boolean {
  return (
    highway !== undefined && WALKED_HIGHWAYS.has(highway) && foot !== 'no' && (access !== 'private' || foot === 'yes')
  );
}

function mainComponent(neighbours: WalkingGraph['neighbours']): Set<number> {
  const seen = new Set<number>();
  let main = new Set<number>();
  for (let start = 0; start < neighbours.length; start += 1) {
    if (seen.has(start)) {
      continue;
    }
    const component = new Set([start]);
    for (const node of component) {
      seen.add(node);
      for (const neighbour of neighbours[node] ?? []) {
        component.add(neighbour.node);
      }
    }
    if (component.size > main.size) {
      main = component;
    }
  }
  return main;
}

export function walkingGraph(ways: readonly OsmWay[]): WalkingGraph {
  const nodeOf = new Map<number, number>();
  const neighbours: WalkingGraph['neighbours'] = [];
  const segments: (Segment & { sacScale: boolean })[] = [];
  const graphNode = (osmNode: number): number => {
    const known = nodeOf.get(osmNode);
    if (known !== undefined) {
      return known;
    }
    nodeOf.set(osmNode, neighbours.length);
    neighbours.push([]);
    return neighbours.length - 1;
  };
  for (const { nodes, geometry, tags } of ways.filter((way) => walkable(way.tags))) {
    const points = geometry.map(({ lat, lon }) => onPlane({ latitude: lat, longitude: lon }));
    for (let index = 1; index < nodes.length; index += 1) {
      const [fromOsm, toOsm, from, to] = [nodes[index - 1], nodes[index], points[index - 1], points[index]];
      if (fromOsm === undefined || toOsm === undefined || from === undefined || to === undefined || fromOsm === toOsm) {
        continue;
      }
      const [fromNode, toNode] = [graphNode(fromOsm), graphNode(toOsm)];
      const metres = Math.hypot(to.x - from.x, to.y - from.y);
      neighbours[fromNode]?.push({ node: toNode, metres });
      neighbours[toNode]?.push({ node: fromNode, metres });
      segments.push({ fromNode, toNode, from, to, metres, sacScale: tags['sac_scale'] !== undefined });
    }
  }
  const main = mainComponent(neighbours);
  return { neighbours, joinable: segments.filter(({ fromNode, sacScale }) => main.has(fromNode) && !sacScale) };
}

// The nearest path and every other within that distance + 20 m. A pin joins each segment in reach at the point of the
// segment nearest to it.
function joinsOf({ joinable }: WalkingGraph, pin: Pin): Join[] {
  const { x, y } = onPlane(pin);
  const measured = joinable.map((segment) => {
    const { from, to, metres } = segment;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const share = metres === 0 ? 0 : Math.min(1, Math.max(0, ((x - from.x) * dx + (y - from.y) * dy) / metres ** 2));
    return {
      segment,
      connector: Math.hypot(from.x + share * dx - x, from.y + share * dy - y),
      along: share * metres,
    };
  });
  const nearest = Math.min(...measured.map(({ connector }) => connector));
  return measured.filter(({ connector }) => connector <= nearest + JOIN_MARGIN_METRES);
}

// A binary heap of nodes by their metres so far, nearest first.
class NearestNodes {
  private readonly heap: { metres: number; node: number }[] = [];

  push(metres: number, node: number): void {
    const { heap } = this;
    let child = heap.length;
    heap.push({ metres, node });
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (this.metresAt(parent) <= metres) {
        break;
      }
      this.swap(parent, child);
      child = parent;
    }
  }

  pop(): { metres: number; node: number } | undefined {
    const { heap } = this;
    const nearest = heap[0];
    const last = heap.pop();
    if (last === undefined || heap.length === 0) {
      return nearest;
    }
    heap[0] = last;
    let parent = 0;
    for (;;) {
      const [left, right] = [2 * parent + 1, 2 * parent + 2];
      const child = this.metresAt(right) < this.metresAt(left) ? right : left;
      if (this.metresAt(parent) <= this.metresAt(child)) {
        return nearest;
      }
      this.swap(parent, child);
      parent = child;
    }
  }

  private metresAt(index: number): number {
    return this.heap[index]?.metres ?? Number.POSITIVE_INFINITY;
  }

  private swap(a: number, b: number): void {
    const { heap } = this;
    const [first, second] = [heap[a], heap[b]];
    if (first !== undefined && second !== undefined) {
      heap[a] = second;
      heap[b] = first;
    }
  }
}

// Metres from a pin's joins to every node, by Dijkstra's algorithm.
function metresToNodes({ neighbours }: WalkingGraph, joins: readonly Join[]): Float64Array {
  const metres = new Float64Array(neighbours.length).fill(Number.POSITIVE_INFINITY);
  const nearest = new NearestNodes();
  const reach = (node: number, distance: number): void => {
    if (distance < (metres[node] ?? 0)) {
      metres[node] = distance;
      nearest.push(distance, node);
    }
  };
  for (const { segment, connector, along } of joins) {
    reach(segment.fromNode, connector + along);
    reach(segment.toNode, connector + segment.metres - along);
  }
  for (let entry = nearest.pop(); entry !== undefined; entry = nearest.pop()) {
    if (entry.metres === metres[entry.node]) {
      for (const neighbour of neighbours[entry.node] ?? []) {
        reach(neighbour.node, entry.metres + neighbour.metres);
      }
    }
  }
  return metres;
}

function metresBetweenJoins(toNodes: Float64Array, starts: ReadonlyMap<Segment, Join>, ends: readonly Join[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const { segment, connector, along } of ends) {
    const viaFrom = (toNodes[segment.fromNode] ?? Number.POSITIVE_INFINITY) + along;
    const viaTo = (toNodes[segment.toNode] ?? Number.POSITIVE_INFINITY) + segment.metres - along;
    const start = starts.get(segment);
    // Both pins on one segment walk along it without reaching a node.
    const direct = start === undefined ? Number.POSITIVE_INFINITY : start.connector + Math.abs(start.along - along);
    best = Math.min(best, Math.min(viaFrom, viaTo, direct) + connector);
  }
  return best;
}

// The walk's seconds from each pin to each pin. A pin to itself takes none.
export function walkingSeconds(graph: WalkingGraph, from: readonly Pin[], to: readonly Pin[]): number[][] {
  const ends = to.map((pin) => joinsOf(graph, pin));
  return from.map((origin) => {
    const joins = joinsOf(graph, origin);
    const toNodes = metresToNodes(graph, joins);
    const starts = new Map(joins.map((join) => [join.segment, join]));
    return to.map((destination, index) => {
      if (origin === destination) {
        return 0;
      }
      const metres = metresBetweenJoins(toNodes, starts, ends[index] ?? []);
      const climb = Math.max(0, destination.elevation - origin.elevation);
      return metres / WALKING_METRES_PER_SECOND + climb * CLIMB_SECONDS_PER_METRE;
    });
  });
}
