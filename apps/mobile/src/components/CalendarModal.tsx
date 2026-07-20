import { useMemo, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'

import { shiftMonth, toISODate, todayISO } from '@/domain'

import { Button } from './Button'
import { minTouchTarget } from '../theme/theme'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

type GridCell = { iso: string; day: number; inMonth: boolean }

/** A fixed 6-week (42-day) grid for `month` (`YYYY-MM`), local-calendar based (§6.6). */
function buildGrid(month: string): GridCell[] {
  const [y, m] = month.split('-').map(Number)
  const firstOfMonth = new Date(y, m - 1, 1)
  const gridStart = new Date(y, m - 1, 1 - firstOfMonth.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    return { iso: toISODate(d), day: d.getDate(), inMonth: d.getMonth() === m - 1 }
  })
}

export type CalendarModalProps = {
  visible: boolean
  /** Selected date (`YYYY-MM-DD`); also seeds the month shown each time the picker opens. */
  value: string
  onSelect: (iso: string) => void
  onClose: () => void
  testID?: string
}

/**
 * A month-grid date picker in a modal (§7.3 "option of a datepicker"). Built entirely from
 * RN core (`Modal`) + this design system's own primitives — no native date-picker dependency,
 * so it works identically on web, Android and iOS.
 */
export function CalendarModal({ visible, value, onSelect, onClose, testID }: CalendarModalProps) {
  const [month, setMonth] = useState(() => value.slice(0, 7))
  // Re-seed the visible month every time the picker (re)opens, adjusted during render rather
  // than in an effect (no extra commit/cascading render — same pattern as LedgerScreen's
  // pagination reset).
  const [prevVisible, setPrevVisible] = useState(visible)
  if (visible !== prevVisible) {
    setPrevVisible(visible)
    if (visible) setMonth(value.slice(0, 7))
  }

  const grid = useMemo(() => buildGrid(month), [month])
  const today = todayISO()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/40 px-6"
        onPress={onClose}
        accessibilityLabel="Close calendar"
        testID={testID}
      >
        <Pressable
          className="w-full max-w-sm gap-3 rounded-card border border-border/60 bg-surface p-4 shadow-sm shadow-black/5"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setMonth((m) => shiftMonth(m, -1))}
              hitSlop={8}
              style={{ minWidth: minTouchTarget, minHeight: minTouchTarget }}
              className="items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              testID="calendar-prev-month"
            >
              <Text className="text-lg text-fg">‹</Text>
            </Pressable>
            <Text className="text-base font-semibold text-fg">{monthLabel(month)}</Text>
            <Pressable
              onPress={() => setMonth((m) => shiftMonth(m, 1))}
              hitSlop={8}
              style={{ minWidth: minTouchTarget, minHeight: minTouchTarget }}
              className="items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Next month"
              testID="calendar-next-month"
            >
              <Text className="text-lg text-fg">›</Text>
            </Pressable>
          </View>

          <View className="flex-row">
            {WEEKDAY_LABELS.map((label, i) => (
              <View key={`weekday-${i}`} className="flex-1 items-center">
                <Text className="text-xs text-muted">{label}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {grid.map((cell) => {
              const selected = cell.iso === value
              const isToday = cell.iso === today
              return (
                <View key={cell.iso} style={{ width: '14.2857%' }} className="items-center py-0.5">
                  <Pressable
                    onPress={() => onSelect(cell.iso)}
                    style={{ minWidth: minTouchTarget * 0.75, minHeight: minTouchTarget * 0.75 }}
                    className={`items-center justify-center rounded-full ${
                      selected ? 'bg-primary' : isToday ? 'border border-primary' : ''
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={cell.iso}
                    accessibilityState={{ selected }}
                    testID={`calendar-day-${cell.iso}`}
                  >
                    <Text
                      className={`text-sm ${
                        selected
                          ? 'font-semibold text-primary-fg'
                          : cell.inMonth
                            ? 'text-fg'
                            : 'text-muted'
                      }`}
                    >
                      {cell.day}
                    </Text>
                  </Pressable>
                </View>
              )
            })}
          </View>

          <View className="flex-row gap-2 pt-1">
            <Button
              label="Today"
              variant="ghost"
              size="sm"
              onPress={() => onSelect(today)}
              testID="calendar-today"
            />
            <Button
              label="Close"
              variant="ghost"
              size="sm"
              onPress={onClose}
              testID="calendar-close"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
