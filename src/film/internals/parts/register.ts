import type * as THREE from 'three'

/**
 * Registers one exploded part group by id (see explode.ts). The returned
 * ref callback is stable per id and returns a cleanup (React 19 ref
 * cleanup) that unregisters exactly the group it attached.
 */
export type PartRegister = (id: string) => (group: THREE.Group | null) => (() => void) | undefined
