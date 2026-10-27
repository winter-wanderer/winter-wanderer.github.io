# Winter Wanderer

Markdown과 Eleventy로 만드는 개인 블로그입니다.

## 로컬 실행

```sh
npm ci
npm run dev
```

## 글 작성

- 게시할 글: `src/content/posts/`
- 검토 중인 초안: `drafts/` (로컬 전용·Git 제외)
- 글 형식은 [기존 원고](src/content/posts/game/eternal-return/lumia-outing.md)를 참고합니다.

## 주요 명령

| 명령 | 용도 |
| --- | --- |
| `npm run dev:drafts` | 초안을 포함한 미리보기 |
| `npm test` | 테스트 |
| `npm run build` | 게시용 사이트를 `dist/`에 생성 |

## 배포

GitHub Actions가 빌드한 `dist/`를 GitHub Pages에 배포합니다. 최초 적용 시 저장소의 **Settings → Pages → Source**를 **GitHub Actions**로 설정합니다.
