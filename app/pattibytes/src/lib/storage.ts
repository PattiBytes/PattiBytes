import AsyncStorage from '@react-native-async-storage/async-storage'

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },
  async set(key: string, value: unknown) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value))
    } catch {}
  },
  async remove(key: string) {
    try {
      await AsyncStorage.removeItem(key)
    } catch {}
  },
}

// In-memory session storage (replaces sessionStorage)
const memStore = new Map<string, string>()
export const session = {
  get<T>(key: string): T | null {
    try {
      const v = memStore.get(key)
      return v ? (JSON.parse(v) as T) : null
    } catch {
      return null
    }
  },
  set(key: string, value: unknown) {
    memStore.set(key, JSON.stringify(value))
  },
  remove(key: string) {
    memStore.delete(key)
  },
}
