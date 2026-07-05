import { LedgerScreen } from '@/features/ledger'

/**
 * App home (§8 Phase 4). The ledger IS the home screen now — reverse-chronological, day-
 * grouped expenses with add / edit / duplicate / delete + Undo. Categories (§7.4) are reached
 * from the header button here; Settings (Phase 5+) will slot in alongside it later.
 */
export default function HomeScreen() {
  return <LedgerScreen />
}
