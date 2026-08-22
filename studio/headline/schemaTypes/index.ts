import { article } from "../../../sanity/schemas/article";
import { author, category, siteSettings, topic } from "../../../sanity/schemas/base";
import { homepage } from "../../../sanity/schemas/homepage";
import { storyThread } from "../../../sanity/schemas/storyThread";

export const schemaTypes = [
  siteSettings,
  homepage,
  article,
  storyThread,
  author,
  category,
  topic,
];
