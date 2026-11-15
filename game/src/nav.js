// Monsoon Market — nav.js. Bot navigation: the waypoint graph and route
// following. The map defines named waypoints ([x, z] in world space) and
// named routes (a route is an ordered list of waypoint names). A bot holds
// a route name + an index into it; nav turns the bot toward each waypoint,
// walks it there with the mover's key set, and advances the index on
// arrival. It also answers "which route takes me from here to that site"
// for defenders rotating after a plant, and finds the nearest waypoint to
// a position for investigations.
import * as THREE from 'three';

const TURN_RATE = 0.12; // radians per fixed step, how fast a bot can turn
const ARRIVE_DIST = 0.4; // metres: close enough to count as "at" a waypoint

export function createNav(map) {
  const waypoints = map.waypoints;
  const routes = map.routes;

  // Position of a waypoint by name, as [x, z]. Null when unknown.
  function waypointPos(name) {
    const wp = waypoints[name];
    return wp ? [wp[0], wp[1]] : null;
  }

  // All waypoint positions of a route, in order, as [[x, z], ...].
  function routePoints(name) {
    const route = routes[name];
    if (!route) return [];
    const out = [];
    for (const wpName of route) {
      const pos = waypointPos(wpName);
      if (pos) out.push(pos);
    }
    return out;
  }

  // Name of the waypoint nearest to (x, z). Used when a bot needs a
  // starting point for an investigation or a rotation.
  function nearestWaypoint(x, z) {
    let best = null;
    let bestDist = Infinity;
    for (const name of Object.keys(waypoints)) {
      const wp = waypoints[name];
      const d = Math.hypot(wp[0] - x, wp[1] - z);
      if (d < bestDist) { best = name; bestDist = d; }
    }
    return best;
  }

  // Steer a body toward (tx, tz): turn at most TURN_RATE toward the target,
  // then press W when roughly facing it, A/D to turn harder. Returns true
  // when the body is within `arrive` metres of the target.
  function steerToward(body, tx, tz, keys, arrive = ARRIVE_DIST) {
    const dx = tx - body.position.x;
    const dz = tz - body.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < arrive) return true;
    const wantYaw = Math.atan2(-dx, -dz);
    let dyaw = wantYaw - body.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    body.yaw += Math.max(-TURN_RATE, Math.min(TURN_RATE, dyaw));
    keys.clear();
    if (Math.abs(dyaw) < 0.6) keys.add('KeyW');
    else if (dyaw > 0) keys.add('KeyA');
    else keys.add('KeyD');
    return false;
  }

  // Advance a bot along its route for one fixed step. The bot carries
  // `route` (a route name) and `routeIndex` (which waypoint it is heading
  // for). Returns the new routeIndex, or -1 when the route is finished
  // (the caller should switch the bot to 'hold').
  function followRoute(bot) {
    const route = routes[bot.route];
    if (!route || bot.routeIndex >= route.length) return -1;
    const wp = waypointPos(route[bot.routeIndex]);
    if (!wp) { bot.routeIndex += 1; return bot.routeIndex; }
    const arrived = steerToward(bot.body, wp[0], wp[1], bot.keys);
    if (arrived) bot.routeIndex += 1;
    return bot.routeIndex;
  }

  // Which route takes a defender from its current x to `site` ('A' | 'B')
  // after the Stormcell is planted. Defenders on the wrong side of the
  // map rotate across mid; defenders already on the right side walk
  // straight to the site.
  function rotationRoute(x, site) {
    const onB = x > 0;
    if (site === 'A') return onB ? 'rotateBtoA' : 'toA';
    return onB ? 'toB' : 'rotateAtoB';
  }

  // A route an attacker takes to `site` from the spawn. Picks the long
  // lane, the mid lane, or a split depending on `style`.
  function attackRoute(site, style) {
    if (site === 'A') {
      if (style === 'mid') return 'attackMidA';
      return 'attackA';
    }
    if (style === 'mid') return 'attackMidB';
    return 'attackB';
  }

  return {
    waypoints,
    routes,
    waypointPos,
    routePoints,
    nearestWaypoint,
    steerToward,
    followRoute,
    rotationRoute,
    attackRoute,
  };
}
