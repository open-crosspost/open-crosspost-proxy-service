/**
 * Post Controllers Index
 * Exports all post-related controllers
 */

export * from './base.controller.ts';
export * from './create.controller.ts';
export * from './repost.controller.ts';
export * from './quote.controller.ts';
export * from './delete.controller.ts';
export * from './reply.controller.ts';
export * from './like.controller.ts';
export * from './unlike.controller.ts';

// Create instances of all controllers for easy access
import { CreateController } from './create.controller.ts';
import { RepostController } from './repost.controller.ts';
import { QuoteController } from './quote.controller.ts';
import { DeleteController } from './delete.controller.ts';
import { ReplyController } from './reply.controller.ts';
import { LikeController } from './like.controller.ts';
import { UnlikeController } from './unlike.controller.ts';

// Export controller instances
export const postControllers = {
  create: new CreateController(),
  repost: new RepostController(),
  quote: new QuoteController(),
  delete: new DeleteController(),
  reply: new ReplyController(),
  like: new LikeController(),
  unlike: new UnlikeController(),
};
