// lib/supabaseCommunity.ts
import { getSupabaseClient } from './supabase';

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

// A minimal typed shape for Supabase/PostgREST errors we care about
interface PgError {
  code?: string;        // e.g., '23505' for unique_violation
  message?: string;
  details?: string;
  hint?: string;
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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const payload = {
    user_id: userId,
    username,
    display_name: displayName,
    photo_url: photoUrl || null,
    message,
    image_url: imageUrl || null,
  };

  const { data, error } = await supabase
    .from('community_messages')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as CommunityMessage;
}

export async function getCommunityMessages(limit = 100) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('community_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as CommunityMessage[];
}

export async function deleteCommunityMessage(messageId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('community_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
}

// ============================================
// Posts Functions
// ============================================

export async function createPost(
  post: Omit<UserPost, 'id' | 'created_at' | 'updated_at' | 'likes_count' | 'comments_count' | 'shares_count'>
) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.from('user_posts').insert(post).select().single();

  if (error) throw error;
  return data as UserPost;
}

export async function getPosts(limit = 20, offset = 0) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('user_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data || []) as UserPost[];
}

export async function getPostsByType(type: 'writing' | 'news' | 'place', limit = 20) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('user_posts')
    .select('*')
    .eq('post_type', type)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as UserPost[];
}

export async function getPostsByUser(userId: string, limit = 20) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('user_posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as UserPost[];
}

export async function updatePost(postId: string, updates: Partial<UserPost>) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, user_id: userId })
    .select()
    .single();

  if (error) {
    const e = error as unknown as PgError;
    if (e.code === '23505') throw new Error('Already liked');
    throw error;
  }
  return data as PostLike;
}

export async function unlikePost(postId: string, userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function checkIfLiked(postId: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const payload = {
    post_id: postId,
    user_id: userId,
    username,
    display_name: displayName,
    photo_url: photoUrl || null,
    comment,
  };

  const { data, error } = await supabase
    .from('post_comments')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as PostComment;
}

export async function getPostComments(postId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as PostComment[];
}

export async function deleteComment(commentId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const channel = supabase
    .channel('community_messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'community_messages' },
      (payload) => callback(payload.new as CommunityMessage)
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

export function subscribeToPostComments(postId: string, callback: (comment: PostComment) => void) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const channel = supabase
    .channel(`post_comments_${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      },
      (payload) => callback(payload.new as PostComment)
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
