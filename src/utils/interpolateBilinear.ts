export default function interpolateBilinear(
  t0: number,
  t1: number,
  b0: number,
  b1: number,
  x: number,
  y: number
): number {
  const top_interpolation = t0 + (t1 - t0) * x
  const bottom_interpolation = b0 + (b1 - b0) * x

  return top_interpolation + (top_interpolation - bottom_interpolation) * y
}
