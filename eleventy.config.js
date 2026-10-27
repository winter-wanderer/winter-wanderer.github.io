import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

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
  if (process.env.SITE_INCLUDE_DRAFTS === '1') {
    const draftRoot = process.env.SITE_DRAFTS || 'drafts';
    eleventyConfig.setUseGitIgnore(false);
    eleventyConfig.addWatchTarget(`${draftRoot}/**/*.md`, { resetConfig: true });
    function registerDrafts(directory, prefix = '') {
      if (!existsSync(directory)) return;
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const relative = path.posix.join(prefix, entry.name);
        const source = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error('Drafts must not contain linked files or directories.');
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) registerDrafts(source, relative);
        else if (entry.isFile() && entry.name.endsWith('.md')) {
          const virtualPath = `content/posts/${relative}`;
          if (existsSync(path.join(input, virtualPath))) throw new Error(`Draft conflicts with published post: ${relative}`);
          eleventyConfig.addTemplate(virtualPath, readFileSync(source, 'utf8'));
        }
      }
    }
    registerDrafts(draftRoot);
  }
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

  eleventyConfig.addPassthroughCopy({ [path.join(input, 'assets/css/style.css').replaceAll('\\', '/')]: 'style.css' });
  eleventyConfig.addPassthroughCopy({ [path.join(input, 'assets/js/quotes.js').replaceAll('\\', '/')]: 'quotes.js' });
  eleventyConfig.addPassthroughCopy({ [path.join(input, '.nojekyll').replaceAll('\\', '/')]: '.nojekyll' });

  return {
    dir: { input, includes: '_includes', output: 'dist' },
    templateFormats: ['njk', 'md'],
    markdownTemplateEngine: false,
  };
}
