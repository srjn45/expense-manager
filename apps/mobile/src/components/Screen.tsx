import { type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type ScreenProps = {
  children: ReactNode
  /** Wrap content in a vertical ScrollView. Default false. */
  scroll?: boolean
  /** Apply the standard 16pt screen padding. Default true. */
  padded?: boolean
  /** Which safe-area edges to inset. Default: top + bottom (left/right handled by padding). */
  edges?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }
  /** Classes for the root (background) container. */
  className?: string
  /** Classes for the content container (padding lives here). */
  contentClassName?: string
  testID?: string
}

/**
 * Page container. Fills the screen with the app background, applies safe-area insets,
 * and standard padding. Every screen renders inside a <Screen>. (§7.7)
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = { top: true, bottom: true },
  className = '',
  contentClassName = '',
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets()
  const safeArea = {
    paddingTop: edges.top ? insets.top : 0,
    paddingBottom: edges.bottom ? insets.bottom : 0,
    paddingLeft: edges.left ? insets.left : 0,
    paddingRight: edges.right ? insets.right : 0,
  }
  const pad = padded ? 'px-4 py-4' : ''

  if (scroll) {
    return (
      <View className={`flex-1 bg-bg ${className}`} style={safeArea} testID={testID}>
        {/* Keeps the focused field above the keyboard — without this, fields near the
            bottom of a form (e.g. Save/Delete, or Tags/Note under "More") end up hidden
            behind the keyboard. iOS has no native resize behavior, so KeyboardAvoidingView
            does the work there; Android already resizes the window itself (app.json sets
            `android.softwareKeyboardLayoutMode: "resize"`), so layering "height"/"padding"
            behavior on top of that double-compensates and the ScrollView doesn't reliably
            settle back down where the focused field actually is — leave it a no-op there.
            The extra bottom padding gives ScrollView's built-in scroll-to-focused-input
            room to bring even the last field fully clear of the keyboard. */}
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName={`${pad} pb-24 ${contentClassName}`}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    )
  }

  return (
    <View className={`flex-1 bg-bg ${className}`} style={safeArea} testID={testID}>
      <View className={`flex-1 ${pad} ${contentClassName}`}>{children}</View>
    </View>
  )
}
