/**
 * Firebase Firestore Database Structure
 * Optimized for all PattiBytes features
 */

// /firestore-structure.js
const FIRESTORE_COLLECTIONS = {
  // Users Collection
  users: {
    [userId]: {
      // Basic Profile
      uid: "string",
      email: "string",
      displayName: "string",
      username: "string", // Unique username
      bio: "string",
      location: "string",
      website: "string",
      phoneNumber: "string",
      
      // Profile Images (Cloudinary URLs)
      photoURL: "string", // Profile picture
      coverURL: "string", // Cover photo
      
      // User Stats
      stats: {
        posts: 0,
        likes: 0,
        comments: 0,
        views: 0,
        followers: 0,
        following: 0,
        videosShared: 0,
        imagesUploaded: 0
      },
      
      // Privacy & Settings
      settings: {
        profileVisibility: "public|private|friends",
        showEmail: false,
        allowComments: true,
        allowMessages: true,
        language: "pa|en",
        theme: "light|dark",
        notifications: {
          email: true,
          push: true,
          likes: true,
          comments: true,
          follows: true,
          news: true
        }
      },
      
      // Social Features
      following: [], // Array of user IDs
      followers: [], // Array of user IDs
      blockedUsers: [], // Array of user IDs
      
      // Activity Tracking
      lastActive: "timestamp",
      isOnline: false,
      createdAt: "timestamp",
      updatedAt: "timestamp"
    }
  },

  // News Articles Collection
  news: {
    [articleId]: {
      // Content
      title: "string",
      content: "string", // Full article content
      preview: "string", // Short preview
      slug: "string", // URL-friendly slug
      
      // Media (Cloudinary URLs)
      featuredImage: "string",
      images: [], // Array of image URLs
      videos: [], // Array of video URLs
      
      // Metadata
      authorId: "string",
      authorName: "string",
      category: "breaking|local|politics|sports|culture",
      tags: [], // Array of tags
      language: "pa|en",
      
      // Engagement
      likes: 0,
      comments: 0,
      views: 0,
      shares: 0,
      
      // Arrays for tracking engagement
      likedBy: [], // Array of user IDs
      sharedBy: [], // Array of user IDs
      
      // Status
      status: "draft|published|archived",
      featured: false,
      sticky: false,
      
      // SEO
      metaDescription: "string",
      keywords: [],
      
      // Timestamps
      publishedAt: "timestamp",
      createdAt: "timestamp",
      updatedAt: "timestamp"
    }
  },

  // Places Collection
  places: {
    [placeId]: {
      // Basic Info
      name: "string",
      nameGurmukhi: "string", // Punjabi name
      description: "string",
      category: "religious|historical|park|market|educational",
      
      // Location
      address: "string",
      coordinates: {
        latitude: 0,
        longitude: 0
      },
      
      // Media (Cloudinary URLs)
      images: [],
      videos: [],
      thumbnailImage: "string",
      
      // Engagement
      likes: 0,
      visits: 0,
      reviews: 0,
      rating: 0, // Average rating
      
      // Content
      history: "string",
      timings: "string",
      contact: "string",
      website: "string",
      
      // User Interactions
      likedBy: [],
      visitedBy: [],
      
      // Status
      verified: false,
      featured: false,
      
      // Timestamps
      createdAt: "timestamp",
      updatedAt: "timestamp"
    }
  },

  // Comments Collection
  comments: {
    [commentId]: {
      // Reference
      itemType: "news|places|videos", // What is being commented on
      itemId: "string", // ID of news, place, or video
      
      // Content
      content: "string",
      
      // Author
      authorId: "string",
      authorName: "string",
      authorAvatar: "string",
      
      // Engagement
      likes: 0,
      replies: 0,
      likedBy: [],
      
      // Parent comment for replies
      parentId: "string|null",
      
      // Status
      status: "published|hidden|deleted",
      
      // Timestamps
      createdAt: "timestamp",
      updatedAt: "timestamp"
    }
  },

  // User Posts/Videos Collection
  posts: {
    [postId]: {
      // Content
      title: "string",
      description: "string",
      type: "image|video|text",
      
      // Media (Cloudinary URLs)
      mediaURL: "string", // Main media file
      thumbnailURL: "string", // Video thumbnail
      
      // Author
      authorId: "string",
      authorName: "string",
      authorAvatar: "string",
      
      // Classification
      category: "news|entertainment|education|other",
      tags: [],
      location: "string",
      
      // Engagement
      likes: 0,
      comments: 0,
      views: 0,
      shares: 0,
      
      // Tracking Arrays
      likedBy: [],
      sharedBy: [],
      viewedBy: [],
      
      // Privacy
      visibility: "public|friends|private",
      
      // Status
      status: "published|archived|deleted",
      
      // Timestamps
      createdAt: "timestamp",
      updatedAt: "timestamp"
    }
  },

  // Notifications Collection
  notifications: {
    [notificationId]: {
      // Target User
      userId: "string",
      
      // Content
      type: "like|comment|follow|news|mention",
      title: "string",
      message: "string",
      
      // Reference
      itemType: "news|post|user|place",
      itemId: "string",
      
      // Sender
      fromUserId: "string",
      fromUserName: "string",
      fromUserAvatar: "string",
      
      // Status
      read: false,
      clicked: false,
      
      // Timestamps
      createdAt: "timestamp",
      expiresAt: "timestamp"
    }
  }
};
