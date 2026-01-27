import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  StyleSheet, 
  TextInput,
  Animated,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAppSelector } from '../../src/store/hooks';
import { COLORS } from '../../src/lib/constants';

type Restaurant = {
  id: string;
  name: string;
  cuisine_type: string[];
  delivery_fee: number;
  delivery_time_minutes: number;
  rating: number;
  banner_url: string | null;
  is_open: boolean;
};

export default function Home() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadRestaurants = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_approved', true)
        .order('rating', { ascending: false });

      if (data) setRestaurants(data);
    };

    loadRestaurants();
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_approved', true)
      .order('rating', { ascending: false });

    if (data) setRestaurants(data);
    setRefreshing(false);
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine_type.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  const navigateToPanel = () => {
    if (profile?.role === 'merchant') router.push('/(panels)/merchant/dashboard' as any);
    else if (profile?.role === 'delivery') router.push('/(panels)/delivery/dashboard' as any);
    else if (profile?.role === 'admin' || profile?.is_superadmin) router.push('/(panels)/admin/dashboard' as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {profile?.full_name?.split(' ')[0] || 'There'}! 👋</Text>
          <Text style={styles.tagline}>What would you like to eat?</Text>
        </View>
        {profile?.role && profile.role !== 'customer' && (
          <Pressable style={styles.panelButton} onPress={navigateToPanel}>
            <Text style={styles.panelIcon}>
              {profile.role === 'admin' || profile.is_superadmin ? '🔐' : profile.role === 'merchant' ? '🏪' : '🚴'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search restaurants or cuisines..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Restaurant List */}
      <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredRestaurants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
  <Pressable 
    style={styles.card}
    onPress={() => router.push(`/restaurant/${item.id}` as any)}
  >
    <View style={[styles.banner, !item.is_open && styles.bannerClosed]}>
      <Text style={styles.bannerEmoji}>🍽️</Text>
      {!item.is_open && (
        <View style={styles.closedBadge}>
          <Text style={styles.closedText}>CLOSED</Text>
        </View>
      )}
    </View>
    
    <View style={styles.cardContent}>
      <Text style={styles.restaurantName}>{item.name}</Text>
      <Text style={styles.cuisines}>{item.cuisine_type.join(' • ')}</Text>
      
      <View style={styles.info}>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>⭐</Text>
          <Text style={styles.infoText}>{item.rating || '4.5'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>🚚</Text>
          <Text style={styles.infoText}>₹{item.delivery_fee}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>⏱️</Text>
          <Text style={styles.infoText}>{item.delivery_time_minutes} min</Text>
        </View>
      </View>
    </View>
  </Pressable>
)}

          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No restaurants found</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { 
    padding: 20, 
    paddingTop: 50,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  greeting: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  panelButton: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  panelIcon: { fontSize: 24 },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    margin: 16, 
    padding: 12, 
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  searchIcon: { fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  listContainer: { flex: 1 },
  list: { padding: 16, paddingTop: 0 },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    marginBottom: 16, 
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  banner: { 
    height: 120, 
    backgroundColor: '#FFE0B2', 
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'relative'
  },
  bannerClosed: { backgroundColor: '#E0E0E0' },
  bannerEmoji: { fontSize: 48 },
  closedBadge: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    backgroundColor: '#F44336', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  closedText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  cardContent: { padding: 16 },
  restaurantName: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  cuisines: { fontSize: 14, color: COLORS.textLight, marginBottom: 12 },
  info: { flexDirection: 'row', gap: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoIcon: { fontSize: 16 },
  infoText: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textLight }
});
