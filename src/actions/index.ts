import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  Stories,
  StoryActs,
  StoryChapters,
  StoryScenes,
  and,
  db,
  eq,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedStory(storyId: string, userId: string) {
  const [story] = await db
    .select()
    .from(Stories)
    .where(and(eq(Stories.id, storyId), eq(Stories.userId, userId)));

  if (!story) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Story not found.",
    });
  }

  return story;
}

async function getOwnedAct(actId: string, storyId: string, userId: string) {
  await getOwnedStory(storyId, userId);

  const [act] = await db
    .select()
    .from(StoryActs)
    .where(and(eq(StoryActs.id, actId), eq(StoryActs.storyId, storyId)));

  if (!act) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Act not found.",
    });
  }

  return act;
}

async function getOwnedChapter(chapterId: string, storyId: string, userId: string) {
  await getOwnedStory(storyId, userId);

  const [chapter] = await db
    .select()
    .from(StoryChapters)
    .where(and(eq(StoryChapters.id, chapterId), eq(StoryChapters.storyId, storyId)));

  if (!chapter) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Chapter not found.",
    });
  }

  return chapter;
}

async function getOwnedScene(sceneId: string, storyId: string, userId: string) {
  await getOwnedStory(storyId, userId);

  const [scene] = await db
    .select()
    .from(StoryScenes)
    .where(and(eq(StoryScenes.id, sceneId), eq(StoryScenes.storyId, storyId)));

  if (!scene) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Scene not found.",
    });
  }

  return scene;
}

export const server = {
  createStory: defineAction({
    input: z.object({
      title: z.string().min(1),
      logline: z.string().optional(),
      genre: z.string().optional(),
      targetAudience: z.string().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [story] = await db
        .insert(Stories)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          title: input.title,
          logline: input.logline,
          genre: input.genre,
          targetAudience: input.targetAudience,
          status: input.status,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { story },
      };
    },
  }),

  updateStory: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        logline: z.string().optional(),
        genre: z.string().optional(),
        targetAudience: z.string().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      })
      .refine(
        (input) =>
          input.title !== undefined ||
          input.logline !== undefined ||
          input.genre !== undefined ||
          input.targetAudience !== undefined ||
          input.status !== undefined ||
          input.notes !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedStory(input.id, user.id);

      const [story] = await db
        .update(Stories)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.logline !== undefined ? { logline: input.logline } : {}),
          ...(input.genre !== undefined ? { genre: input.genre } : {}),
          ...(input.targetAudience !== undefined
            ? { targetAudience: input.targetAudience }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          updatedAt: new Date(),
        })
        .where(eq(Stories.id, input.id))
        .returning();

      return {
        success: true,
        data: { story },
      };
    },
  }),

  listStories: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const stories = await db
        .select()
        .from(Stories)
        .where(eq(Stories.userId, user.id));

      return {
        success: true,
        data: { items: stories, total: stories.length },
      };
    },
  }),

  createStoryAct: defineAction({
    input: z.object({
      storyId: z.string().min(1),
      orderIndex: z.number().int().optional(),
      title: z.string().optional(),
      summary: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedStory(input.storyId, user.id);

      const [act] = await db
        .insert(StoryActs)
        .values({
          id: crypto.randomUUID(),
          storyId: input.storyId,
          orderIndex: input.orderIndex ?? 1,
          title: input.title,
          summary: input.summary,
          createdAt: new Date(),
        })
        .returning();

      return {
        success: true,
        data: { act },
      };
    },
  }),

  updateStoryAct: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        storyId: z.string().min(1),
        orderIndex: z.number().int().optional(),
        title: z.string().optional(),
        summary: z.string().optional(),
      })
      .refine(
        (input) =>
          input.orderIndex !== undefined ||
          input.title !== undefined ||
          input.summary !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedAct(input.id, input.storyId, user.id);

      const [act] = await db
        .update(StoryActs)
        .set({
          ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
        })
        .where(eq(StoryActs.id, input.id))
        .returning();

      return {
        success: true,
        data: { act },
      };
    },
  }),

  deleteStoryAct: defineAction({
    input: z.object({
      id: z.string().min(1),
      storyId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedAct(input.id, input.storyId, user.id);

      await db
        .delete(StoryActs)
        .where(eq(StoryActs.id, input.id));

      return { success: true };
    },
  }),

  listStoryActs: defineAction({
    input: z.object({
      storyId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedStory(input.storyId, user.id);

      const acts = await db
        .select()
        .from(StoryActs)
        .where(eq(StoryActs.storyId, input.storyId));

      return {
        success: true,
        data: { items: acts, total: acts.length },
      };
    },
  }),

  createStoryChapter: defineAction({
    input: z.object({
      storyId: z.string().min(1),
      actId: z.string().optional(),
      orderIndex: z.number().int().optional(),
      title: z.string().optional(),
      povCharacter: z.string().optional(),
      summary: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedStory(input.storyId, user.id);

      if (input.actId) {
        await getOwnedAct(input.actId, input.storyId, user.id);
      }

      const now = new Date();
      const [chapter] = await db
        .insert(StoryChapters)
        .values({
          id: crypto.randomUUID(),
          storyId: input.storyId,
          actId: input.actId ?? null,
          orderIndex: input.orderIndex ?? 1,
          title: input.title,
          povCharacter: input.povCharacter,
          summary: input.summary,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { chapter },
      };
    },
  }),

  updateStoryChapter: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        storyId: z.string().min(1),
        actId: z.string().optional(),
        orderIndex: z.number().int().optional(),
        title: z.string().optional(),
        povCharacter: z.string().optional(),
        summary: z.string().optional(),
      })
      .refine(
        (input) =>
          input.actId !== undefined ||
          input.orderIndex !== undefined ||
          input.title !== undefined ||
          input.povCharacter !== undefined ||
          input.summary !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedChapter(input.id, input.storyId, user.id);

      if (input.actId !== undefined && input.actId !== null) {
        await getOwnedAct(input.actId, input.storyId, user.id);
      }

      const [chapter] = await db
        .update(StoryChapters)
        .set({
          ...(input.actId !== undefined ? { actId: input.actId } : {}),
          ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.povCharacter !== undefined ? { povCharacter: input.povCharacter } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          updatedAt: new Date(),
        })
        .where(eq(StoryChapters.id, input.id))
        .returning();

      return {
        success: true,
        data: { chapter },
      };
    },
  }),

  deleteStoryChapter: defineAction({
    input: z.object({
      id: z.string().min(1),
      storyId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedChapter(input.id, input.storyId, user.id);

      await db
        .delete(StoryChapters)
        .where(eq(StoryChapters.id, input.id));

      return { success: true };
    },
  }),

  listStoryChapters: defineAction({
    input: z.object({
      storyId: z.string().min(1),
      actId: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedStory(input.storyId, user.id);

      if (input.actId) {
        await getOwnedAct(input.actId, input.storyId, user.id);
      }

      const chapters = await db
        .select()
        .from(StoryChapters)
        .where(
          input.actId
            ? and(
                eq(StoryChapters.storyId, input.storyId),
                eq(StoryChapters.actId, input.actId)
              )
            : eq(StoryChapters.storyId, input.storyId)
        );

      return {
        success: true,
        data: { items: chapters, total: chapters.length },
      };
    },
  }),

  createStoryScene: defineAction({
    input: z.object({
      storyId: z.string().min(1),
      chapterId: z.string().optional(),
      orderIndex: z.number().int().optional(),
      setting: z.string().optional(),
      goal: z.string().optional(),
      conflict: z.string().optional(),
      outcome: z.string().optional(),
      content: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedStory(input.storyId, user.id);

      if (input.chapterId) {
        await getOwnedChapter(input.chapterId, input.storyId, user.id);
      }

      const now = new Date();
      const [scene] = await db
        .insert(StoryScenes)
        .values({
          id: crypto.randomUUID(),
          storyId: input.storyId,
          chapterId: input.chapterId ?? null,
          orderIndex: input.orderIndex ?? 1,
          setting: input.setting,
          goal: input.goal,
          conflict: input.conflict,
          outcome: input.outcome,
          content: input.content,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { scene },
      };
    },
  }),

  updateStoryScene: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        storyId: z.string().min(1),
        chapterId: z.string().optional(),
        orderIndex: z.number().int().optional(),
        setting: z.string().optional(),
        goal: z.string().optional(),
        conflict: z.string().optional(),
        outcome: z.string().optional(),
        content: z.string().optional(),
      })
      .refine(
        (input) =>
          input.chapterId !== undefined ||
          input.orderIndex !== undefined ||
          input.setting !== undefined ||
          input.goal !== undefined ||
          input.conflict !== undefined ||
          input.outcome !== undefined ||
          input.content !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedScene(input.id, input.storyId, user.id);

      if (input.chapterId !== undefined && input.chapterId !== null) {
        await getOwnedChapter(input.chapterId, input.storyId, user.id);
      }

      const [scene] = await db
        .update(StoryScenes)
        .set({
          ...(input.chapterId !== undefined ? { chapterId: input.chapterId } : {}),
          ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
          ...(input.setting !== undefined ? { setting: input.setting } : {}),
          ...(input.goal !== undefined ? { goal: input.goal } : {}),
          ...(input.conflict !== undefined ? { conflict: input.conflict } : {}),
          ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
          ...(input.content !== undefined ? { content: input.content } : {}),
          updatedAt: new Date(),
        })
        .where(eq(StoryScenes.id, input.id))
        .returning();

      return {
        success: true,
        data: { scene },
      };
    },
  }),

  deleteStoryScene: defineAction({
    input: z.object({
      id: z.string().min(1),
      storyId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedScene(input.id, input.storyId, user.id);

      await db
        .delete(StoryScenes)
        .where(eq(StoryScenes.id, input.id));

      return { success: true };
    },
  }),

  listStoryScenes: defineAction({
    input: z.object({
      storyId: z.string().min(1),
      chapterId: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedStory(input.storyId, user.id);

      if (input.chapterId) {
        await getOwnedChapter(input.chapterId, input.storyId, user.id);
      }

      const scenes = await db
        .select()
        .from(StoryScenes)
        .where(
          input.chapterId
            ? and(
                eq(StoryScenes.storyId, input.storyId),
                eq(StoryScenes.chapterId, input.chapterId)
              )
            : eq(StoryScenes.storyId, input.storyId)
        );

      return {
        success: true,
        data: { items: scenes, total: scenes.length },
      };
    },
  }),
};
