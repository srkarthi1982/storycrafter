/**
 * StoryCrafter - helps users plan story arcs, chapters, and scenes.
 *
 * Design goals:
 * - A user can have many stories.
 * - Each story can have ordered acts, chapters, and scenes.
 * - Acts & chapters are optional layer: some users only use chapters, some only scenes.
 * - Future-friendly fields for genre, targetAudience, tone, etc.
 */

import { defineTable, column, NOW } from "astro:db";

export const Stories = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),                         // from parent auth
    title: column.text(),
    logline: column.text({ optional: true }),      // one-line plot description
    genre: column.text({ optional: true }),        // e.g. "Fantasy", "Romance"
    targetAudience: column.text({ optional: true }), // e.g. "YA", "Adult", "Children"
    status: column.text({ optional: true }),       // "idea", "outline", "draft", "completed"
    notes: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const StoryActs = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    storyId: column.text({
      references: () => Stories.columns.id,
    }),
    orderIndex: column.number(),                  // 1, 2, 3...
    title: column.text({ optional: true }),       // e.g. "Act I - Setup"
    summary: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
});

export const StoryChapters = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    storyId: column.text({
      references: () => Stories.columns.id,
    }),
    actId: column.text({
      references: () => StoryActs.columns.id,
      optional: true,                             // some stories might skip acts
    }),
    orderIndex: column.number(),                  // chapter order
    title: column.text({ optional: true }),
    povCharacter: column.text({ optional: true }),// POV character name
    summary: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const StoryScenes = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    storyId: column.text({
      references: () => Stories.columns.id,
    }),
    chapterId: column.text({
      references: () => StoryChapters.columns.id,
      optional: true,                             // scene can be attached later
    }),
    orderIndex: column.number(),                  // ordering inside chapter/act
    setting: column.text({ optional: true }),     // where/when
    goal: column.text({ optional: true }),        // character goal in this scene
    conflict: column.text({ optional: true }),    // what goes wrong
    outcome: column.text({ optional: true }),     // how it ends
    content: column.text({ optional: true }),     // rough draft or beats
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const tables = {
  Stories,
  StoryActs,
  StoryChapters,
  StoryScenes,
} as const;
