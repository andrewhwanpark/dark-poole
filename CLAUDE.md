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
- `_posts/` - All posts organized in subdirectories:
  - `_posts/long-form/` - Long-form blog posts (`YYYY-MM-DD-title.md`)
  - `_posts/bits/` - Short updates/bits (`YYYY-MM-DD-title.md`)
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
- NO COLORS - user specifically rejected blue/cyan accents, wants pure b&w
- No gradients, no glows, no visual effects
- Lowercase titles for blog posts and page headings
- Simple hover states (opacity/color changes only)
- Fast, smooth transitions (0.2-0.3s)

**Typography**
- Post titles: 1.5rem
- All major headings and navigation: lowercase
- Subtle spacing and transitions
- Profile tagline/location text: 0.85rem, gray, minimal

**User Preferences (from design sessions)**
- Rejected colorful accents (specifically cyan/blue) - keep everything grayscale
- Prefers "minimal and awesome" over flashy
- Wants regular text capitalization (not ALL CAPS or Title Case)
- Single line bio instead of multiple paragraphs
- Tight spacing between elements (reduced gaps)
- No decorative elements (dollar signs, extra symbols removed)

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

## Common Tasks & Workflows

### Creating a New Blog Post
```bash
# Long-form post
touch _posts/long-form/YYYY-MM-DD-title.md
# Add frontmatter: layout: post, title: lowercase title, type: long-form
```

### Creating a Short Update (bit)
```bash
# Short post
touch _posts/bits/YYYY-MM-DD-short-title.md
# Add frontmatter: layout: post, title: short title, type: short
# Keep content to 2 sentences max
```

### Testing Locally
```bash
bundle exec jekyll serve
# Visit http://localhost:4000
# Server auto-regenerates on file changes (except _config.yml)
```

### Deploying
```bash
git add -A
git commit -m "description of changes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin gh-pages
# GitHub Pages auto-deploys in 1-2 minutes
```

### Testing Social Previews
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/
- Facebook: https://developers.facebook.com/tools/debug/

## Important Notes

- **Pagination**: Configured to 10 posts per page, but Jekyll's `jekyll-paginate` doesn't support filtering by post type. Current implementation uses Liquid filters instead.
- **GitHub Profile Photo**: Used throughout - home page, favicon, and social media previews (`https://github.com/ctrlaltgiri.png`)
- **Branch Strategy**: Active branch is `gh-pages` (serves as both development and deployment)
- **Baseurl**: Currently empty (`baseurl: ""`) since site is at root domain
- **Images**: All blog post images are auto-centered via CSS in `_base.scss`
- **Utterances**: Requires app installation at https://github.com/apps/utterances (one-time setup)
- **Jekyll Server**: May need restart if changes to `_config.yml` don't appear (Ctrl+C then restart)
