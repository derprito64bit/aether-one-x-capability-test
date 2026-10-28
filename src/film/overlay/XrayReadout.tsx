/** X-ray hover readout: part name plus one-line technical detail. */
export function XrayReadout({ readout }: { readout: string }) {
  return (
    <p
      role="status"
      data-testid="xray-readout"
      className="rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.06em] text-(--color-ink) uppercase"
    >
      {readout}
    </p>
  )
}
