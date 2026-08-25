/**
 * Dropdown-style Radix content — Select, DropdownMenu, Popover, Combobox —
 * portals into `document.body` wrapped in a div carrying this attribute,
 * placing it outside the Dialog/AlertDialog/Sheet's own DOM subtree even
 * though it renders visually on top.
 *
 * A click inside that portal is a genuine `pointerdown` on `document`, so the
 * modal's dismissable layer sees it as an "outside" interaction and closes
 * the modal — the classic "Select inside a Dialog closes the Dialog" bug.
 * Every modal content wrapper below calls this from its `onPointerDownOutside`
 * to recognize and ignore those clicks.
 */
export function isRadixPopperPointerDown(event: { target: EventTarget | null }): boolean {
  const target = event.target as Node | null
  if (!target || !(target instanceof Element)) return false
  return target.closest("[data-radix-popper-content-wrapper]") !== null
}
