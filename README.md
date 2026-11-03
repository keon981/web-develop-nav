# Web Develop Nav

A Notion-powered navigation site for front-end development tools, built with Astro and shadcn/ui.

Inspired by [M-Nav](https://github.com/busyhe/m-nav) and [WebNav](https://github.com/wangfengyuan/frontend-nav).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshot-dark.png" />
  <img alt="Web Develop Nav" src="docs/screenshot-light.png" />
</picture>

## Features

- Content managed in a Notion database
- Items grouped by category, following the option order and colors in Notion
- Sidebar that highlights the current category
- Instant search by name, description, domain or category
- Automatic favicons for items without an icon
- Light and dark mode, responsive layout
- Static site, rebuilt automatically after Notion changes

## Setup

Requires Node.js 22.23.4 or later and pnpm 10.

1. Clone the repository:

```bash
git clone https://github.com/keon981/web-develop-nav.git
cd web-develop-nav
```

2. Install dependencies:

```bash
pnpm install
```

3. Copy `.env.example` to `.env` and set:

```bash
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
```

- `NOTION_TOKEN`: the secret of an [internal Notion integration](https://www.notion.so/profile/integrations). Share your database with it from the database menu (**•••** → **Connections**).
- `NOTION_DATABASE_ID`: the database ID, or the full database URL.

4. Start the development server:

```bash
pnpm dev
```

Without Notion credentials, the development server shows sample data.

## Notion Database Structure

Your database should have the following properties:

- **Name** (title): The name of the item. Items without a name are hidden.
- **link** (URL): The URL to open. Items without a link are shown but not clickable.
- **Desc** (text): A short description (optional).
- **Type** (select or multi-select): The category (optional).
- **icon link** (URL): A custom icon (optional). Falls back to the page icon, then the site's favicon.
- **Sort** (number): The order within a category (optional).

Missing properties are treated as empty. Property names are case-insensitive and can be changed in `src/config/site.ts`.

## Deploy on Cloudflare Pages

1. Create a Pages project connected to this repository:
   - Build command: `pnpm build`
   - Build output directory: `dist`
2. Add the environment variables `NOTION_TOKEN`, `NOTION_DATABASE_ID` and `PNPM_VERSION=10.28.0`.
3. Deploy.

If Notion can't be read during a build, the build fails and the previous deployment stays online.

## Automatic Rebuilds

When an item changes in Notion, the site is rebuilt after 10 minutes without further changes:

Notion webhook → `/api/notion-webhook` → GitHub Actions (waits 10 minutes) → Cloudflare Pages deploy hook

1. In Cloudflare Pages, go to **Settings** → **Builds** → **Add deploy hook**, and save the URL as the GitHub Actions secret `CLOUDFLARE_DEPLOY_HOOK_URL`.
2. Create a [GitHub fine-grained token](https://github.com/settings/personal-access-tokens) for this repository with the **Actions: Read and write** permission.
3. Add the Cloudflare Pages environment variables:
   - `GITHUB_DISPATCH_TOKEN`: the token from step 2
   - `GITHUB_DISPATCH_REPO`: this repository, e.g. `keon981/web-develop-nav`
4. In your Notion integration, create a webhook subscription for `https://<your-project>.pages.dev/api/notion-webhook` with page and data source events.
5. Notion sends a verification token to the endpoint. Find it in the deployment's Functions logs (**View details** → **Functions**), paste it in Notion to verify, then set it as `NOTION_WEBHOOK_SECRET` and redeploy.

The workflow only runs from the default branch (`main`).

## Scripts

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Start the development server |
| `pnpm build`     | Build the static site        |
| `pnpm preview`   | Preview the build            |
| `pnpm test`      | Run unit tests               |
| `pnpm lint`      | Lint the code                |
| `pnpm typecheck` | Type-check the code          |
