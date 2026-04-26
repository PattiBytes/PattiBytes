 
import { StyleSheet, Platform } from 'react-native'
import { COLORS } from '../../lib/constants'
import { useThemedStyles } from '@/hooks/useThemedStyles'

export function useDashboardStyles() {
  return useThemedStyles(c => StyleSheet.create({
  // Header
  header:        { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16 },
  headerTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logo:          { width: 38, height: 38, borderRadius: 10 },
  logoPh:        { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  greeting:      { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 },
  locationBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  iconBtn:       { padding: 8, position: 'relative' },
  badge:         { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeTxt:      { color: '#fff', fontSize: 9, fontWeight: '800' },
  // Search
  searchRow:     { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  searchInput:   { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  menuCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', width: 110, elevation: 1 },
  // Announcement
  announceBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, margin: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FCD34D' },
  // Quick Actions
  quickAction:   { alignItems: 'center', gap: 5 },
  quickIcon:     { width: 58, height: 58, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  quickLabel:    { fontSize: 10, color: '#6B7280', fontWeight: '700' },
  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secTitle:      { fontSize: 17, fontWeight: '900', color: COLORS.text },
  seeAll:        { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  // Deals
  dealCard:      { borderRadius: 16, padding: 14, width: 140, alignItems: 'center' },
  dealLabel:     { fontSize: 17, fontWeight: '900', color: '#fff', textAlign: 'center' },
  dealCode:      { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 5, letterSpacing: 1.5, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  dealMin:       { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  dealExp:       { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  // Active Orders
  activeCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  statusPill:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  // Trending
  trendCard:     { width: 135, backgroundColor: '#fff', borderRadius: 16, padding: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  trendImgBox:   { width: '100%', height: 100, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden', position: 'relative' },
  trendDisc:     { position: 'absolute', top: 6, right: 6, backgroundColor: '#EF4444', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  trendFireBadge:{ position: 'absolute', bottom: 6, left: 6, backgroundColor: '#FFF3EE', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  trendName:     { fontSize: 12, fontWeight: '700', color: COLORS.text },
  trendMerch:    { fontSize: 10, color: '#6B7280', marginTop: 2 },
  trendPrice:    { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  // Filters
  filterChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  // Restaurant card
  restCard:      { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  restCardClosed:{ opacity: 0.6 },
  restLogo:      { width: 68, height: 68, borderRadius: 12, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 },
  featuredBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#F59E0B', borderRadius: 5, paddingHorizontal: 4, paddingVertical: 2 },
  closedOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 3, alignItems: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  restName:      { fontSize: 15, fontWeight: '800', color: COLORS.text },
  star:          { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  metaText:      { fontSize: 12, color: '#6B7280' },
  minOrder:      { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  offerTag:      { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 5, alignSelf: 'flex-start' },
  // Bottom Nav
  bottomNav:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: Platform.OS === 'ios' ? 28 : 12, paddingTop: 10, elevation: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } },
  navItem:       { flex: 1, alignItems: 'center' },
  navLabel:      { fontSize: 10, color: '#9CA3AF', marginTop: 3, fontWeight: '600' },
  navBadge:      { position: 'absolute', top: -3, right: -6, backgroundColor: COLORS.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  navBadgeTxt:   { color: '#fff', fontSize: 9, fontWeight: '800' },
  // Popup
  popupOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popup:         { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', elevation: 20 },
  popupBtn:      { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
 btn: { backgroundColor: c.primary }
  }))
}