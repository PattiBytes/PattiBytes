// functions/index.js
import {onDocumentWritten} from 'firebase-functions/v2/firestore';
import {setGlobalOptions} from 'firebase-functions/v2/options';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore, FieldValue} from 'firebase-admin/firestore';

setGlobalOptions({maxInstances: 10});

initializeApp();
const db = getFirestore();

/**
 * Compute +1 for create, -1 for delete, 0 otherwise.
 * @param {boolean} beforeExists
 * @param {boolean} afterExists
 * @return {number}
 */
const diffInc = (beforeExists, afterExists) => {
  if (!beforeExists && afterExists) return 1;
  if (beforeExists && !afterExists) return -1;
  return 0;
};

/**
 * Post likes counter.
 * Path: posts/{postId}/likes/{uid}
 */
export const onPostLikeWrite = onDocumentWritten(
  'posts/{postId}/likes/{uid}',
  async (event) => {
    const inc = diffInc(
      event.data.before.exists,
      event.data.after.exists,
    );
    if (inc === 0) return;

    try {
      await db
        .doc(`posts/${event.params.postId}`)
        .update({
          likesCount: FieldValue.increment(inc),
        });
    } catch (err) {
      // Optional: console.error('onPostLikeWrite error', err);
    }
  },
);

/**
 * Comment likes counter.
 * Path: posts/{postId}/comments/{commentId}/likes/{uid}
 */
export const onCommentLikeWrite = onDocumentWritten(
  'posts/{postId}/comments/{commentId}/likes/{uid}',
  async (event) => {
    const inc = diffInc(
      event.data.before.exists,
      event.data.after.exists,
    );
    if (inc === 0) return;

    try {
      await db
        .doc(
          `posts/${event.params.postId}/comments/` +
            `${event.params.commentId}`,
        )
        .update({
          likesCount: FieldValue.increment(inc),
        });
    } catch (err) {
      // Optional: console.error('onCommentLikeWrite error', err);
    }
  },
);

/**
 * Comments and replies counters:
 * - Top-level comments (+/-) update posts.{commentsCount}
 * - Reply create/delete updates parentComment.{repliesCount}
 * Path: posts/{postId}/comments/{commentId}
 */
export const onCommentWrite = onDocumentWritten(
  'posts/{postId}/comments/{commentId}',
  async (event) => {
    const before = event.data.before.exists ?
      event.data.before.data() :
      null;
    const after = event.data.after.exists ?
      event.data.after.data() :
      null;

    const parentBefore = (before && before.parentId) ? before.parentId : null;
    const parentAfter = (after && after.parentId) ? after.parentId : null;

    // Reply created => parent.repliesCount +1
    if (!before && after && parentAfter) {
      try {
        await db
          .doc(`posts/${event.params.postId}/comments/${parentAfter}`)
          .update({
            repliesCount: FieldValue.increment(1),
          });
      } catch (err) {
        // Optional: console.error('reply inc error', err);
      }
    }

    // Reply deleted => parent.repliesCount -1
    if (before && !after && parentBefore) {
      try {
        await db
          .doc(`posts/${event.params.postId}/comments/${parentBefore}`)
          .update({
            repliesCount: FieldValue.increment(-1),
          });
      } catch (err) {
        // Optional: console.error('reply dec error', err);
      }
    }

    // Top-level (no parentId) created => posts.commentsCount +1
    const wasParent = Boolean(before && !before.parentId);
    const isParent = Boolean(after && !after.parentId);

    if (!before && isParent) {
      try {
        await db
          .doc(`posts/${event.params.postId}`)
          .update({
            commentsCount: FieldValue.increment(1),
          });
      } catch (err) {
        // Optional: console.error('commentsCount inc error', err);
      }
    }

    // Top-level deleted => posts.commentsCount -1
    if (wasParent && !after) {
      try {
        await db
          .doc(`posts/${event.params.postId}`)
          .update({
            commentsCount: FieldValue.increment(-1)});
      } catch (err) {
        // Optional: console.error('commentsCount dec error', err);
      }
    }
  },
);
