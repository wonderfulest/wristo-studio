import { FabricElement } from "@/types/element";

export function hasIconFont(obj: FabricElement): boolean {
  return obj.eleType === 'icon' || obj.eleType === 'bluetooth' || obj.eleType === 'alarms' || obj.eleType === 'disturb' || obj.eleType === 'notification'
}