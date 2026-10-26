# Winter Wanderer

Markdown으로 글을 쓰고 Eleventy로 정적 HTML을 만드는 개인 블로그입니다. 화면은 HTML, CSS, 바닐라 JavaScript로 구성합니다.

## 로컬에서 보기

```sh
npm ci
npm run dev
```

Eleventy 개발 서버가 알려주는 주소를 브라우저에서 열면 됩니다. `npm test`는 임시 글을 추가해 글 페이지와 목록이 함께 만들어지는지 확인합니다.

## 글 쓰기

`src/content/posts/<카테고리>/<주제>/<파일명>.md`에 글 파일을 만듭니다. 주제가 없다면 카테고리 바로 아래에 둬도 됩니다. 첫 글인 [`lumia-outing.md`](src/content/posts/game/eternal-return/lumia-outing.md)를 복사해 시작할 수 있습니다.

```md
---
title: 글 제목
summary: 목록에 보일 한 줄 소개
date: 2026-10-26
category:
  slug: game
  name: 게임
topic:
  slug: eternal-return
  name: 이터널리턴
postTags: []
---

여기에 글을 씁니다.
```

`topic`은 선택 사항입니다. 태그는 `postTags`에 `- { slug: c-sharp, name: 'C#' }`처럼 추가합니다. `slug`는 주소에 쓰이므로 영문 소문자, 숫자, 하이픈만 사용합니다. 파일의 폴더와 이름이 공개 글 주소가 됩니다. 예를 들어 위 첫 글은 `/posts/game/eternal-return/lumia-outing.html`입니다.

```sh
npm run build
```

`npm run dev`는 `.site-build`에서 미리보기를 제공합니다. `npm run build`는 저장소 루트의 HTML 파일을 갱신하고, 삭제된 글과 목록의 오래된 HTML도 정리합니다. GitHub Pages가 현재 `main` 브랜치의 루트를 게시하므로, 글 원고와 생성된 HTML 및 `.generated-pages.json`을 함께 커밋합니다. 생성된 HTML은 직접 수정하지 않습니다. 모든 페이지는 검색 제외를 위한 `noindex` 메타 태그를 포함합니다. 커밋 전에 `npm test`와 `npm run build`를 실행하고 `git status --short`로 생성된 파일을 확인하세요.
