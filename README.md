# kkyoutube-redirect

A simple Cloudflare Worker that redirects [kkyoutube.com](https://kkyoutube.com) to a random working [cobalt](https://cobalt.tools) frontend, so you can download any YouTube video by adding `kk` in front of `youtube` in the address bar.

## How to use

Add `kk` in front of `youtube` in any YouTube URL:

| Original                                              | Visit instead                                            |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `https://www.youtube.com/watch?v=dQw4w9WgXcQ`         | `https://kkyoutube.com/watch?v=dQw4w9WgXcQ`              |
| `https://www.youtube.com/shorts/abc123`               | `https://kkyoutube.com/shorts/abc123`                    |
| `https://music.youtube.com/watch?v=dQw4w9WgXcQ`       | `https://music.kkyoutube.com/watch?v=dQw4w9WgXcQ`        |
| `https://m.youtube.com/watch?v=dQw4w9WgXcQ`           | `https://m.kkyoutube.com/watch?v=dQw4w9WgXcQ`            |

You'll be 302'd to a random working cobalt frontend with the URL pre-filled, and have it auto-downloaded. Picks come from a different pool depending on the URL shape:

- `/shorts/...` → `youtube-shorts` pool
- `music.` subdomain → `youtube-music` pool
- everything else → `youtube` pool

### Bookmarklet

Drag this to your bookmarks bar (or visit [kkyoutube.com](https://kkyoutube.com) for a draggable copy) — click it on any YouTube tab to jump to the equivalent kkyoutube URL:

```js
javascript:(()=>{const u=location.href;const r=u.replace(/^(https?:\/\/)(www\.|m\.|music\.)?youtube\.com/,'$1$2kkyoutube.com');if(r!==u)open(r);})();
```

## How it works

1. A request like `https://kkyoutube.com/watch?v=X` hits the Worker.
2. The Worker reconstructs the target URL by swapping the host back: `https://www.youtube.com/watch?v=X` (or `music.` / `m.` if you used those subdomains).
3. It fetches the live list of working frontends from [cobalt.directory](https://cobalt.directory) (edge-cached for 5 minutes), picks one at random from the appropriate sub-pool, and 302s to `<frontend>/?u=<encoded-url>`.

If the directory is unreachable or the sub-pool is empty, the Worker falls back to [cobalt.tools](https://cobalt.tools) directly.

## Deploy

```bash
npx wrangler deploy
```

Cloudflare auto-provisions DNS and TLS for each `custom_domain` route in `wrangler.toml`.

## Credit

- [cobalt.tools](https://cobalt.tools)
- [cobalt.directory](https://cobalt.directory) & [hyperdefined](https://hyper.lol) (fluffy maintainer) - the community-maintained list of cobalt instances
