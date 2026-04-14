import React from 'react'
import { View, ScrollView, Alert, RefreshControl } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCart } from '../../../contexts/CartContext'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'
import { ScreenLoader } from '../../../components/ui/ScreenLoader'
import { useDashboard } from '../../../components/dashboard/hooks/useDashboard'
import { openTimeLabel } from '../../../components/dashboard/helpers'
import SearchResults from '../../../components/dashboard/SearchResults'
import SearchSuggestions from '../../../components/dashboard/SearchSuggestions'
import { AppStatusBar } from '../../../components/ui/AppStatusBar'
import {
  DashboardHeader,
  SearchBar,
  AnnouncementBanner,
  AnnouncementPopup,
  QuickActions,
  ShopByCategory,
  GlobalDeals,
  ActiveOrders,
  TrendingSection,
  RestaurantList,
  BottomNav,
  LocationModal,
  SocialLinks,
} from '../../../components/dashboard'
import { Merchant } from '../../../components/dashboard/types'

export default function CustomerDashboard() {
  const { user, profile } = useAuth()
  const { cart }          = useCart()
  const router            = useRouter()
  const nav               = (p: string) => router.push(p as any)

  const {
    loading,
    appSettings,
    locationText,
    showLocModal,
    setShowLocModal,
    loadingR,
    activeOrders,
    trending,
    isFeaturedTrending,
    globalDeals,
    search,
    setSearch,
    menuResults,
    restaurantResults,
    customProductResults,
    searchingMenu,
    searchFocused,
    setSearchFocused,
    searchSuggestions,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    refreshing,
    onRefresh,
    showPopup,
    setShowPopup,
    dismissed,
    setDismissed,
    unreadCount,
    activeTab,
    setActiveTab,
    cuisineFilter,
    setCuisineFilter,
    announcement,
    allCuisines,
    displayRestaurants,
    handleLocationPick,
    shopCategories,
    loadingCategories,
  } = useDashboard()

  const cartCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0

  const firstName =
  profile?.full_name?.trim().split(' ')[0]                             ||
  (user?.user_metadata?.full_name as string | undefined)?.trim().split(' ')[0] ||
  user?.user_metadata?.name?.trim().split(' ')[0]                       ||
  (user?.email?.includes('@privaterelay.appleid.com') ? 'there' : user?.email?.split('@')[0]) ||
  'there'

  function handleRestaurantPress(r: Merchant) {
    if (!r.is_open) {
      const openLabel = openTimeLabel(r)
      Alert.alert(
        '🔒 Restaurant Closed',
        `${r.business_name} is currently closed.${openLabel ? `\n\n${openLabel}` : ''}`,
        [{ text: 'OK' }],
      )
      return
    }
    nav(`/(customer)/restaurant/${r.id}`)
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenLoader variant="dashboard" />
      </SafeAreaView>
    )
  }

  return (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
    <AppStatusBar backgroundColor="#F8F9FA" style="dark" />
    <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <DashboardHeader
        appSettings={appSettings}
        firstName={firstName}
        avatarUrl={profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | null) ?? null}
        unreadCount={unreadCount}
        cartCount={cartCount}
        locationText={locationText}
        onNotifications={() => nav('/(customer)/notifications')}
        onCart={() => nav('/(customer)/cart')}
        onLocationPress={() => setShowLocModal(true)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* SEARCH INPUT */}
        <SearchBar
          search={search}
          onChangeSearch={setSearch}
          loading={searchingMenu}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />

        {/* SUGGESTIONS — recent + fuzzy, visible when focused with short query */}
        <SearchSuggestions
          visible={searchFocused && search.trim().length < 2}
          query={search}
          recentSearches={recentSearches}
          suggestions={searchSuggestions}
          onSelect={term => {
            setSearch(term)
            addRecentSearch(term)
          }}
          onClearRecent={clearRecentSearches}
        />

        {/* SEARCH RESULTS — 3 sections: restaurants, menu items, products */}
        {search.trim().length >= 2 && (
          <SearchResults
            query={search}
            searching={searchingMenu}
            menuResults={menuResults}
            restaurantResults={restaurantResults}
            customProductResults={customProductResults}
            onMenuItemPress={(merchantId, itemId) =>
              router.push({
                pathname: '/(customer)/restaurant/[id]',
                params: { id: merchantId, focusItemId: itemId },
              } as any)
            }
            onRestaurantPress={id => {
              addRecentSearch(
                restaurantResults.find(r => r.id === id)?.business_name ?? search,
              )
              router.push(`/(customer)/restaurant/${id}` as any)
            }}
            onCustomProductPress={id =>
              router.push(`/(customer)/shop/product/${id}` as any)
            }
          />
        )}

        {/* Rest of dashboard — hidden while search is active */}
        {search.trim().length < 2 && (
          <>
            {/* ANNOUNCEMENT BANNER */}
            {announcement && !dismissed && (
              <AnnouncementBanner
                announcement={announcement}
                onDismiss={() => setDismissed(true)}
              />
            )}

            {/* QUICK ACTIONS */}
            <QuickActions onNav={nav} />

            {/* SHOP BY CATEGORY */}
            <ShopByCategory
              categories={shopCategories}
              loadingCategories={loadingCategories}
              onNav={nav}
            />

            {/* GLOBAL DEALS */}
            {globalDeals.length > 0 && (
              <GlobalDeals deals={globalDeals} onNav={nav} />
            )}

            {/* ACTIVE ORDERS */}
            {activeOrders.length > 0 && (
              <ActiveOrders orders={activeOrders} onNav={nav} />
            )}

            {/* TRENDING / FEATURED */}
            {trending.length > 0 && (
              <TrendingSection
                dishes={trending}
                isFeatured={isFeaturedTrending}
                onNav={nav}
              />
            )}

            {/* RESTAURANTS */}
            <RestaurantList
              restaurants={displayRestaurants}
              loading={loadingR}
              activeTab={activeTab}
              cuisineFilter={cuisineFilter}
              allCuisines={allCuisines}
              onTabChange={setActiveTab}
              onCuisineChange={setCuisineFilter}
              onRestaurantPress={handleRestaurantPress}
            />

            {/* SOCIAL / SUPPORT */}
            <SocialLinks settings={appSettings ?? {}} />
            <View style={{ height: 16 }} />
          </>
        )}
      </ScrollView>

      {/* BOTTOM NAV */}
      <BottomNav
        cartCount={cartCount}
        avatarUrl={profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | null) ?? null}
        firstName={firstName}
        onNav={nav}
      />

      {/* LOCATION MODAL */}
      <LocationModal
        visible={showLocModal}
        current={locationText}
        onClose={() => setShowLocModal(false)}
        onPick={handleLocationPick}
      />

      {/* ANNOUNCEMENT POPUP */}
      <AnnouncementPopup
        visible={showPopup && !!announcement}
        announcement={announcement}
        onDismiss={() => {
          setShowPopup(false)
          setDismissed(true)
        }}
      />
    </SafeAreaView>
  )
}