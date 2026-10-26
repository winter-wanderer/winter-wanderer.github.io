import path from 'node:path';

const input = process.env.SITE_INPUT ?? 'src';
const postGlob = `${path.relative(process.cwd(), path.resolve(input)).replaceAll('\\', '/')}/content/posts/**/*.md`;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function checkSlug(group, kind) {
  if (!group || !slugPattern.test(group.slug) || !group.name) {
    throw new Error(`${kind} needs a name and a lowercase URL slug (letters, numbers, hyphens).`);
  }
  return group;
}

function posts(collections) {
  return collections.getFilteredByGlob(postGlob).sort((a, b) => b.date - a.date || a.inputPath.localeCompare(b.inputPath));
}

function groupPosts(items, getGroup) {
  const groups = new Map();
  for (const post of items) {
    const group = getGroup(post);
    if (!group) continue;
    const key = `${group.parentSlug ?? ''}/${group.slug}`;
    if (groups.has(key) && groups.get(key).name !== group.name) {
      throw new Error(`Conflicting names for slug ${key}`);
    }
    if (!groups.has(key)) groups.set(key, { ...group, posts: [] });
    groups.get(key).posts.push(post);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export default function (eleventyConfig) {
  eleventyConfig.addTransform('trimHtmlLineEndings', function (content) {
    return this.page.outputPath?.endsWith('.html') ? content.replace(/[\t ]+$/gm, '') : content;
  });
  eleventyConfig.addCollection('posts', posts);
  eleventyConfig.addCollection('postCategories', (collections) =>
    groupPosts(posts(collections), (post) => checkSlug(post.data.category, 'category')));
  eleventyConfig.addCollection('postTopics', (collections) =>
    groupPosts(posts(collections), (post) => post.data.topic && {
      ...checkSlug(post.data.topic, 'topic'),
      parentSlug: checkSlug(post.data.category, 'category').slug,
      parentName: post.data.category.name,
    }));
  eleventyConfig.addCollection('postTags', (collections) => {
    const groups = new Map();
    for (const post of posts(collections)) {
      for (const tag of post.data.postTags ?? []) {
        checkSlug(tag, 'tag');
        const existing = groups.get(tag.slug);
        if (existing && existing.name !== tag.name) {
          throw new Error(`Conflicting names for tag slug ${tag.slug}`);
        }
        if (!existing) groups.set(tag.slug, { ...tag, posts: [] });
        groups.get(tag.slug).posts.push(post);
      }
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  });

  eleventyConfig.addPassthroughCopy({ 'style.css': 'style.css' });
  eleventyConfig.addPassthroughCopy({ 'quotes.js': 'quotes.js' });

  return {
    dir: { input, includes: '_includes', output: '.site-build' },
    templateFormats: ['njk', 'md'],
    markdownTemplateEngine: false,
  };
}
