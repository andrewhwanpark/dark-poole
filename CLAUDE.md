# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal blog built with Jekyll, focused on documenting an AI journey. It features two types of content:
- **Long-form posts**: Traditional blog posts with individual pages
- **Shorts (bits)**: Quick 2-sentence updates displayed inline in a timeline (no individual pages)

The site is deployed via GitHub Pages on the `gh-pages` branch.

## Development Commands

### Setup
```bash
# Install dependencies (first time only)
gem install jekyll jekyll-gist jekyll-sitemap jekyll-seo-tag
gem install bundler
bundle install
```

### Local Development
```bash
# Build and serve locally at http://localhost:4000
bundle exec jekyll serve

# Build only (output to _site/)
bundle exec jekyll build

# Serve with live reload and drafts
bundle exec jekyll serve --drafts --livereload
```

## Content Architecture

### Post Types
Posts are distinguished by the `type` frontmatter field:

**Long-form posts** (`type: long-form`):
```yaml
---
layout: post
title: Post Title
type: long-form
date: YYYY-MM-DD
---
```
- Display on `/blogs` page and home page (3 latest)
- Have individual pages at `/YYYY/MM/DD/title/`
- Show in "Related posts" sections

**Short posts** (`type: short`):
```yaml
---
layout: post
title: Short Update
type: short
date: YYYY-MM-DD
---
```
- Display only on `/bits` timeline page
- No individual pages (redirect to `/bits` if accessed directly)
- Not shown in "Related posts"

### File Structure
- `_posts/` - All posts (both types) with naming: `YYYY-MM-DD-title.md`
- `_layouts/` - Page templates (default, home, post, page)
- `_sass/` - Modular SCSS files
- `_includes/` - Reusable HTML components (currently minimal)
- `blogs.html` - Long-form posts listing page
- `bits.html` - Shorts timeline page
- `index.html` - Home page (uses `home` layout)

### Layout System

**Layout hierarchy**:
- `default.html` - Base layout with masthead/navigation and footer
  - `home.html` - Home page with profile and 3 latest posts
  - `post.html` - Individual post pages (handles both post types)
  - `page.html` - Static pages

**Key layout behaviors**:
- `_layouts/post.html` checks `page.type` and redirects shorts to `/bits`
- Related posts filter excludes shorts (`post.type != "short"`)
- Home page filters for `type: "long-form"` when displaying latest posts

## Styling Architecture

SCSS is modular and imported in `styles.scss`:
- `_variables.scss` - CSS custom properties (colors, fonts, spacing)
- `_home.scss` - Home page, profile section, post previews
- `_bits.scss` - Shorts timeline styling with terminal-inspired design
- `_posts.scss` - Individual post page styling
- `_masthead.scss` - Fixed header navigation

**Theme**: Permanent dark mode via `[data-theme="dark-poole"]` attribute in `_variables.scss`

## Navigation Configuration

Edit `_config.yml` to modify navigation (all lowercase):
```yaml
nav:
  - title: home
    url: /
  - title: thoughts
    url: /blogs
  - title: bits
    url: /bits
```

Note: "thoughts" links to `/blogs` - the nav label is different from the URL for better branding.

## Design Philosophy

**Minimal Black & White**
- Pure black background (#000), white text, gray accents
- No colors, no gradients, no effects
- Lowercase titles for blog posts and page headings
- Simple hover states (opacity/color changes only)

**Typography**
- Post titles: 1.5rem
- All major headings and navigation: lowercase
- Subtle spacing and transitions

## Social & Engagement Features

### Comments System (Utterances)
- GitHub Issues-based comments on blog posts
- Script in `_layouts/post.html`
- Theme: `github-dark` to match site
- Requires utterances app installed on GitHub repo: https://github.com/apps/utterances

### Social Media Previews
- Open Graph and Twitter Card meta tags in `_includes/head.html`
- Always uses GitHub profile image: `https://github.com/ctrlaltgiri.png`
- Auto-generates title and description from post content
- Test with: Twitter Card Validator, LinkedIn Post Inspector

### Footer Links
- GitHub: https://github.com/ctrlaltgiri
- LinkedIn: https://linkedin.com/in/giridharbalachandran
- Email: gb555@cornell.edu

### Home Page Profile
Structure in `_layouts/home.html`:
1. Profile photo (GitHub avatar)
2. @ctrlaltgiri (linked to GitHub)
3. Location/status line
4. Tagline
5. Bio line
6. 3 latest blog posts

## Important Notes

- **Pagination**: Configured to 10 posts per page, but Jekyll's `jekyll-paginate` doesn't support filtering by post type. Current implementation uses Liquid filters instead.
- **GitHub Profile Photo**: Used throughout - home page, favicon, and social media previews
- **Branch Strategy**: Active branch is `gh-pages` (serves as both development and deployment)
- **Baseurl**: Currently empty (`baseurl: ""`) since site is at root domain
- **Images**: All blog post images are auto-centered via CSS in `_base.scss`
