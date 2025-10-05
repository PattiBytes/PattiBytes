import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Community features will be disabled.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // We're using Firebase for auth
  }
});

// ============================================
// TypeScript Interfaces
// ============================================

export interface CommunityMessage {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  photo_url?: string;
  message: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserPost {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  photo_url?: string;
  title: string;
  content: string;
  preview?: string;
  post_type: 'writing' | 'news' | 'place';
  image_url?: string;
  video_url?: string;
  location?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at?: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  display_name: string;
  photo_url?: string;
  comment: string;
  created_at: string;
}

// ============================================
// Community Chat Functions
// ============================================

export async function sendCommunityMessage(
  userId: string,
  username: string,
  displayName: string,
  message: string,
  photoUrl?: string,
  imageUrl?: string
) {
  const { data, error } = await supabase
    .from('community_messages')
    .insert({
      user_id: userId,
      username,
      display_name: displayName,
      photo_url: photoUrl,
      message,
      image_url: imageUrl
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCommunityMessages(limit: number = 100) {
  const { data, error } = await supabase
    .from('community_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data as CommunityMessage[];
}

export async function deleteCommunityMessage(messageId: string) {
  const { error } = await supabase
    .from('community_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
}

// ============================================
// Posts Functions
// ============================================

export async function createPost(post: Omit<UserPost, 'id' | 'created_at' | 'updated_at' | 'likes_count' | 'comments_count' | 'shares_count'>) {
  const { data, error } = await supabase
    .from('user_posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data as UserPost;
}

export async function getPosts(limit: number = 20, offset: number = 0) {
  const { data, error } = await supabase
    .from('user_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data as UserPost[];
}

export async function getPostsByType(type: 'writing' | 'news' | 'place', limit: number = 20) {
  const { data, error } = await supabase
    .from('user_posts')
    .select('*')
    .eq('post_type', type)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as UserPost[];
}

export async function getPostsByUser(userId: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('user_posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as UserPost[];
}

export async function updatePost(postId: string, updates: Partial<UserPost>) {
  const { data, error } = await supabase
    .from('user_posts')
    .update(updates)
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data as UserPost;
}

export async function deletePost(postId: string) {
  const { error } = await supabase
    .from('user_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
}

// ============================================
// Likes & Comments Functions
// ============================================

export async function likePost(postId: string, userId: string) {
  const { data, error } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, user_id: userId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Already liked');
    throw error;
  }
  return data as PostLike;
}

export async function unlikePost(postId: string, userId: string) {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function checkIfLiked(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

export async function addComment(
  postId: string,
  userId: string,
  username: string,
  displayName: string,
  comment: string,
  photoUrl?: string
) {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      username,
      display_name: displayName,
      photo_url: photoUrl,
      comment
    })
    .select()
    .single();

  if (error) throw error;
  return data as PostComment;
}

export async function getPostComments(postId: string) {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as PostComment[];
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

// ============================================
// Realtime Subscriptions
// ============================================

export function subscribeToCommunityMessages(callback: (message: CommunityMessage) => void) {
  const subscription = supabase
    .channel('community_messages')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'community_messages' },
      (payload) => callback(payload.new as CommunityMessage)
    )
    .subscribe();

  return () => subscription.unsubscribe();
}

export function subscribeToPostComments(postId: string, callback: (comment: PostComment) => void) {
  const subscription = supabase
    .channel(`post_comments_${postId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'post_comments',
        filter: `post_id=eq.${postId}`
      },
      (payload) => callback(payload.new as PostComment)
    )
    .subscribe();

  return () => subscription.unsubscribe();
}

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}
