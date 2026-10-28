import {
  BluetoothIcon,
  CameraIcon,
  CaretLeftIcon,
  ChatCircleIcon,
  CloudSunIcon,
  FlashlightIcon,
  GearSixIcon,
  ImagesIcon,
  MapTrifoldIcon,
  MoonIcon,
  MusicNotesIcon,
  TimerIcon,
  WifiHighIcon,
} from '../icons.tsx'
import type { Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { OS_APPS, type AppId } from '../../data/software.ts'

type Screen = { name: 'home' } | { name: 'app'; app: AppId } | { name: 'shade' }

const APP_BODY: Record<AppId, string> = {
  camera: 'Five focal lengths. Tap the shutter, keep the photo.',
  photos: 'Cleanup runs on-device. Nothing uploads to fix a picture.',
  messages: 'Summaries are written locally. No server reads along.',
  weather: 'Glanceable. Quiet. Correct.',
  music: 'Lossless over Wi-Fi 7, cached for offline.',
  maps: 'Offline regions included. The blue dot stays yours.',
  timer: 'Haptics, not noise.',
  settings: 'Every toggle explained in one line.',
}

const APP_ICON: Record<AppId, Icon> = {
  camera: CameraIcon,
  photos: ImagesIcon,
  messages: ChatCircleIcon,
  weather: CloudSunIcon,
  music: MusicNotesIcon,
  maps: MapTrifoldIcon,
  timer: TimerIcon,
  settings: GearSixIcon,
}

const TOGGLES: Array<{ key: string; label: string; icon: Icon }> = [
  { key: 'wifi', label: 'Wi-Fi', icon: WifiHighIcon },
  { key: 'bluetooth', label: 'Bluetooth', icon: BluetoothIcon },
  { key: 'dnd', label: 'Focus', icon: MoonIcon },
  { key: 'flashlight', label: 'Torch', icon: FlashlightIcon },
]

/** Deeper than the film wallpaper where labels sit: white 11px text keeps 5:1+. */
const WALLPAPER =
  'radial-gradient(110% 38% at 50% 112%, rgba(255,243,226,0.7), rgba(255,243,226,0) 70%), linear-gradient(180deg, #0f2c66 0%, #1c47a3 60%, #2f5fc0 100%)'
const SPRING = { type: 'spring', stiffness: 380, damping: 34 } as const

/**
 * Interactive AetherOS phone: home grid of eight apps, app screens, a
 * notification shade with quick-settings switches. Every control is a real
 * button with a 44px target; toggles are switches with aria-checked.
 */
export function AetherOSPhone() {
  const reduced = useReducedMotion()
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [notifications, setNotifications] = useState<string[]>([
    'Photos finished local cleanup',
    'Transcript ready, offline',
  ])
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    wifi: true,
    bluetooth: false,
    dnd: false,
    flashlight: false,
  })

  const dismiss = (note: string) => setNotifications((ns) => ns.filter((n) => n !== note))
  const flip = (k: string) => setToggles((t) => ({ ...t, [k]: !t[k] }))
  const openApp = screen.name === 'app' ? OS_APPS.find((a) => a.id === screen.app) : undefined
  const OpenIcon = screen.name === 'app' ? APP_ICON[screen.app] : null

  return (
    <div
      data-testid="os-phone"
      className="dark-scope mx-auto w-[280px] sm:w-[300px] rounded-[52px] bg-[linear-gradient(160deg,#3a3d44,#16171b_40%,#2a2c32)] p-[11px] shadow-[0_0_0_1px_rgba(28,27,25,0.25),0_50px_90px_-40px_rgba(20,20,30,0.7)]"
    >
      <div
        className="relative h-[600px] overflow-hidden rounded-[42px] bg-black"
        style={{ background: WALLPAPER }}
      >
        {/* Status bar */}
        <div
          className={`relative z-30 flex h-12 items-center justify-between px-6 pt-1 transition-colors duration-300 ${
            screen.name === 'app' ? 'text-[#1c1b19]' : 'text-white'
          }`}
        >
          <span className="text-[13px] font-semibold tabular-nums">9:41</span>
          {/* Round punch-hole, matching the model's PUNCH (3.2 mm). Never a
              capsule: that shape is a real product's signature and fails the
              originality gate (docs/device-originality.md). */}
          <span
            aria-hidden="true"
            className="absolute top-3.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-black shadow-[0_0_0_1.5px_rgba(255,255,255,0.08)]"
          />
          <button
            type="button"
            aria-label={screen.name === 'shade' ? 'Close notifications' : 'Open notifications'}
            aria-expanded={screen.name === 'shade'}
            onClick={() =>
              setScreen((s) => (s.name === 'shade' ? { name: 'home' } : { name: 'shade' }))
            }
            data-testid="os-shade-toggle"
            className="-mr-2 min-h-11 min-w-11 rounded-full px-2 text-[12px] font-medium"
          >
            {notifications.length > 0 ? `${notifications.length} new` : 'Clear'}
          </button>
        </div>

        {/* Home: inert while an app or the shade covers it. */}
        <div className="px-5 pt-6 text-white" inert={screen.name !== 'home'}>
          <p className="text-center text-[64px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
            9:41
          </p>
          <p className="mt-2 text-center text-sm text-white/80">Wednesday, quiet day</p>
          <ul aria-label="Apps" className="mt-10 grid grid-cols-4 gap-x-2 gap-y-5">
            {OS_APPS.map((app) => {
              const AppIcon = APP_ICON[app.id]
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    onClick={() => setScreen({ name: 'app', app: app.id })}
                    data-testid={`os-app-${app.id}`}
                    aria-label={`Open ${app.name}`}
                    className="flex w-full min-h-11 flex-col items-center gap-1.5 rounded-2xl transition-transform active:scale-95"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 items-center sm:h-[52px] sm:w-[52px] justify-center rounded-[16px] bg-white/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-md"
                    >
                      <AppIcon size={26} weight="regular" />
                    </span>
                    <span className="max-w-full truncate text-[11px] text-white">{app.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/80"
        />

        {/* App screen */}
        <AnimatePresence>
          {openApp !== undefined && OpenIcon !== null ? (
            <motion.div
              key={openApp.id}
              data-testid="os-app-screen"
              className="light-scope absolute inset-0 z-20 bg-(--color-night) px-5 pt-14 text-(--color-ink)"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, borderRadius: 42 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              transition={SPRING}
            >
              <button
                type="button"
                onClick={() => setScreen({ name: 'home' })}
                data-testid="os-app-close"
                aria-label="Back to home"
                className="-ml-2 flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-medium text-(--color-aether-strong)"
              >
                <CaretLeftIcon size={16} weight="bold" aria-hidden="true" />
                Home
              </button>
              <span
                aria-hidden="true"
                className="mt-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-(--color-aether-strong) text-white"
              >
                <OpenIcon size={32} />
              </span>
              <h3 className="mt-5 text-3xl font-semibold tracking-[-0.03em]">{openApp.name}</h3>
              <p className="mt-1 text-sm font-medium text-(--color-aether-strong)">
                {openApp.tagline}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-(--color-dim)">
                {APP_BODY[openApp.id]}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Notification shade */}
        <AnimatePresence>
          {screen.name === 'shade' ? (
            <motion.div
              key="shade"
              data-testid="os-shade"
              className="absolute inset-0 z-20 bg-[#0b0e16]/72 px-4 pt-14 text-white backdrop-blur-xl"
              initial={reduced ? { opacity: 0 } : { y: '-100%' }}
              animate={reduced ? { opacity: 1 } : { y: '0%' }}
              exit={reduced ? { opacity: 0 } : { y: '-100%' }}
              transition={SPRING}
            >
              <h3 className="px-1 text-sm font-semibold">Quick settings</h3>
              <div className="mt-3 grid grid-cols-2 gap-2" data-testid="os-quick">
                {TOGGLES.map(({ key, label, icon: ToggleIcon }) => {
                  const on = toggles[key] === true
                  return (
                    <button
                      key={key}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() => flip(key)}
                      data-testid={`os-toggle-${key}`}
                      data-on={on}
                      className="flex min-h-14 items-center gap-2.5 rounded-2xl px-3 text-left text-sm font-medium transition-colors data-[on=false]:bg-white/10 data-[on=true]:bg-white data-[on=true]:text-[#0f2c66]"
                    >
                      <ToggleIcon size={20} weight={on ? 'fill' : 'regular'} aria-hidden="true" />
                      {label}
                    </button>
                  )
                })}
              </div>
              <h3 className="mt-6 px-1 text-sm font-semibold">Notifications</h3>
              {notifications.length === 0 && (
                <p className="mt-3 px-1 text-sm text-white/75">All caught up.</p>
              )}
              <ul className="mt-3 space-y-2">
                <AnimatePresence initial={false}>
                  {notifications.map((note) => (
                    <motion.li
                      key={note}
                      layout={!reduced}
                      exit={{ opacity: 0, x: 40 }}
                      transition={SPRING}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-white/12 py-1.5 pr-1.5 pl-4"
                    >
                      <span className="text-sm">{note}</span>
                      <button
                        type="button"
                        onClick={() => dismiss(note)}
                        aria-label={`Dismiss ${note}`}
                        data-testid="os-dismiss"
                        className="min-h-11 min-w-11 rounded-full px-3 text-xs font-medium text-white/85 hover:bg-white/10"
                      >
                        Clear
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
