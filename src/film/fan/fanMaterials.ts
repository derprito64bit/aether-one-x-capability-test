import { Color, type MeshPhysicalMaterial } from 'three'
import type { FinishId } from '../../data/product.ts'
import {
  FINISH_PARAMS,
  type PhoneMaterialSet,
} from '../../components/PhoneViewer/phoneMaterials.ts'

/** Materials whose look depends on the finish: cloned per fan card. */
const FINISH_KEYS = [
  'framePX',
  'frameNX',
  'framePY',
  'frameNY',
  'frameChamfer',
  'back',
  'island',
  'collarOuter',
  'collarTop',
  'knurlWall',
  'collarStep',
  'antenna',
  'logo',
] as const satisfies ReadonlyArray<keyof PhoneMaterialSet>

/**
 * A finish's material set for a fan card, built over the film's base set:
 * the finish-dependent materials are clones recoloured from FINISH_PARAMS
 * (same recipes as createPhoneMaterials), everything else (lens glass,
 * collar text, maps) is shared, so five cards cost thirteen materials each
 * and no new textures. Clones are transparent from birth like their
 * sources. Dispose with disposeFanMaterialSet (clones only).
 */
export function createFanMaterialSet(base: PhoneMaterialSet, finish: FinishId): PhoneMaterialSet {
  const params = FINISH_PARAMS[finish]
  const set: PhoneMaterialSet = { ...base }
  for (const key of FINISH_KEYS) {
    const m = base[key].clone()
    m.name = `${key}#${finish}`
    set[key] = m
  }
  const frame = new Color(params.frameColor)
  for (const key of ['framePX', 'frameNX', 'framePY', 'frameNY'] as const) {
    set[key].color.copy(frame)
    set[key].roughness = params.frameRoughness
    set[key].anisotropy = params.frameAnisotropy
  }
  set.frameChamfer.color.copy(frame)
  set.frameChamfer.roughness = params.frameRoughness * 0.6
  set.frameChamfer.anisotropy = params.frameAnisotropy
  for (const key of ['collarOuter', 'collarTop', 'knurlWall', 'collarStep'] as const) {
    set[key].color.copy(frame)
  }
  const brushed = params.family === 'brushed'
  const back: MeshPhysicalMaterial = set.back
  back.color.set(params.backColor)
  back.metalness = params.backMetalness
  back.roughness = params.backRoughness
  back.clearcoat = params.backClearcoat
  back.clearcoatRoughness = params.backClearcoatRoughness
  back.sheen = params.family === 'anodised' ? 0.5 : 0
  back.sheenColor.set(params.backColor)
  back.envMapIntensity = brushed ? 1.25 : 1.05
  if (brushed) back.map = null
  if (params.transparentBack === true) {
    back.color.set('#121722')
    back.roughness = 0.06
    back.clearcoat = 1
    back.opacity = 0.45
    back.depthWrite = false
    back.envMapIntensity = 1.4
  }
  set.island.color.set(params.islandColor)
  set.island.metalness = params.backMetalness
  set.island.roughness = Math.min(0.28, params.backRoughness * 0.8)
  set.island.clearcoat = Math.min(1, params.backClearcoat + 0.05)
  set.island.clearcoatRoughness = Math.max(0.05, params.backClearcoatRoughness - 0.05)
  if (brushed) set.island.map = null
  set.antenna.color.set(params.antennaColor)
  const backColor = new Color(params.backColor)
  const lum = backColor.getHSL({ h: 0, s: 0, l: 0 }).l
  set.logo.color.copy(backColor).lerp(new Color(lum > 0.6 ? '#1a1d24' : '#ffffff'), 0.16)
  return set
}

/** Disposes the clones a fan set owns (never the shared base materials). */
export function disposeFanMaterialSet(set: PhoneMaterialSet): void {
  for (const key of FINISH_KEYS) set[key].dispose()
}
