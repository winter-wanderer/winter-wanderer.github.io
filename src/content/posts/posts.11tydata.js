export default {
  layout: 'post.njk',
  eleventyComputed: {
    permalink: (data) => `${data.page.filePathStem.replace(/^\/content\/posts/, '/posts')}.html`,
  },
};
