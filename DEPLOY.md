# Deploying to Netlify

The game is one static HTML file with no dependencies and no server side, so this is
about as easy as web deployment gets. Netlify's free tier covers it comfortably.

This repo is already configured — `netlify.toml` declares the build. Three ways, fastest first.

## 1. Drag and drop (about a minute, no account setup, no git)

1. Run `./build.sh` — it writes `public/index.html`.
2. Go to <https://app.netlify.com/drop>.
3. Drag the **`public` folder** onto the page.

That's it — you get a live URL straight away, before you've even signed in. Sign in
afterwards to keep the site and rename it to something better than
`spontaneous-pixie-4f2a81`. To publish a change, rebuild and drag the folder again.

## 2. Netlify CLI

```sh
npm i -g netlify-cli
cd this-folder
netlify deploy          # builds, uploads, gives you a draft URL to check
netlify deploy --prod   # publish it for real
```

The first run asks whether to link or create a site. The CLI reads `netlify.toml`, runs
`build.sh`, and publishes `public/`.

## 3. Git-backed (recommended if you'll keep editing)

```sh
git init
git add .
git commit -m "Galactic Battlegrounds Lite"
git branch -M main
git remote add origin https://github.com/brodemcd-pixel/swgb.git
git push -u origin main
```

Then in Netlify: **Add new site → Import an existing project**, pick the repo, and
press Deploy. Don't type anything into the build settings — `netlify.toml` already
declares them:

```toml
[build]
  command = "sh build.sh"
  publish = "public"
```

From then on every push to `main` redeploys automatically, and every pull request gets
its own Deploy Preview URL. You edit a file in `src/`, push, and the site rebuilds —
you never commit the built HTML, which is why `public/` is in `.gitignore`.

If a deploy ever goes wrong, **Deploys → select an older one → Publish deploy** rolls
back instantly.

## Custom domain

**Site configuration → Domain management → Add a domain.** Netlify then shows you the
exact DNS records to add at your registrar — either pointing a `CNAME` at your
`*.netlify.app` hostname, or switching your nameservers to Netlify DNS, which is the
easier option if you want the apex domain (`example.com`, not just `www.`). Use the
values Netlify displays rather than any written down elsewhere; they change.

HTTPS is provisioned automatically and free via Let's Encrypt, usually within a minute
of the DNS resolving.

## Notes

- **No environment variables, no database, no functions.** Everything runs in the
  visitor's browser. Saved games, campaign progress and custom sprites live in that
  browser's `localStorage`, so they are per-device and never reach a server.
- **Nothing is fetched from anywhere.** No CDN scripts, no fonts, no analytics —
  verified by loading the built file over HTTP and asserting zero external requests.
  That also means no cookie banner is required.
- **Bandwidth** is about 176 KB per visit, roughly 45 KB gzipped (Netlify compresses
  automatically). The free tier's 100 GB/month is not a realistic concern.
- **Caching**: `netlify.toml` marks `index.html` `must-revalidate` so players get new
  versions immediately rather than a stale cached build.
- **Anywhere else works too.** The same `public/` folder deploys unchanged to Vercel,
  Cloudflare Pages, GitHub Pages, S3, or any static host. Nothing here is
  Netlify-specific except this one config file.

## Local preview

```sh
./build.sh && cd public && python3 -m http.server 8000
```

Then open <http://localhost:8000>. Worth doing before you deploy — it is the same code
path as production, whereas opening the file directly with `file://` is not.
