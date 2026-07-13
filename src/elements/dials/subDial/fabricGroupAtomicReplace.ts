/**
 * Fabric Group atomic replacement compatibility layer for Fabric 6.7.x only.
 *
 * Fabric's public remove/insertAt/removeAll APIs each trigger FitContent layout,
 * so a logical replacement performs multiple coordinate corrections and drifts.
 * Fabric 6.7.x has no public batch replacement API. Keep the single internal
 * collection assertion here, preserve Fabric's group/subscription lifecycle,
 * then request exactly one imperative layout.
 */
import type { FabricObject, Group } from 'fabric'

type FabricGroup67Internals = Group & {
  _objects: FabricObject[]
}

function fabric67Internals(group: Group): FabricGroup67Internals {
  return group as unknown as FabricGroup67Internals
}

export function atomicReplaceGroupObjects(group: Group, objects: FabricObject[]): void {
  const current = group.getObjects()
  const removed = current.filter((object) => !objects.includes(object))
  const added = objects.filter((object) => !current.includes(object))
  const layoutManager = group.layoutManager

  layoutManager.unsubscribeTargets({ target: group, targets: removed })
  removed.forEach((object) => group.exitGroup(object, true))
  fabric67Internals(group)._objects = [...objects]
  added.forEach((object) => group.enterGroup(object, false))
  layoutManager.subscribeTargets({ target: group, targets: added })
  group.triggerLayout({ bubbles: false })
}
