export function hasDisallowedControlCharacter(value: string, allowLineBreaks = false): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined) continue
    const control = codePoint <= 0x1f || codePoint === 0x7f
    const allowedWhitespace =
      allowLineBreaks && (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d)
    if (control && !allowedWhitespace) return true
  }
  return false
}
