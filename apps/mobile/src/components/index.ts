// Primitives kit (§7.7). Every screen in later phases is built ONLY from these.
// Adding a new primitive here is allowed; ad-hoc restyling inside a screen is not.
export { Screen, type ScreenProps } from './Screen'
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button'
export { Card, type CardProps } from './Card'
export { Input, type InputProps } from './Input'
export { Chip, type ChipProps } from './Chip'
export { FAB, type FABProps } from './FAB'
export { AmountText, type AmountTextProps } from './AmountText'
export { EmptyState, type EmptyStateProps } from './EmptyState'
export {
  SegmentedControl,
  type SegmentedControlProps,
  type Segment,
  type SegmentTone,
} from './SegmentedControl'
export { Snackbar, type SnackbarProps } from './Snackbar'
export {
  ColorSwatchPicker,
  type ColorSwatchPickerProps,
  CATEGORY_SWATCHES,
} from './ColorSwatchPicker'
export { CalendarModal, type CalendarModalProps } from './CalendarModal'
export { DatePickerField, type DatePickerFieldProps } from './DatePickerField'
export { SelectField, type SelectFieldProps, type SelectOption } from './SelectField'
