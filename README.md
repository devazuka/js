# Starter

A starter pack of JS exercises

## How to use it

### In a web browser

Go to [js.devazuka.com](https://js.devazuka.com)

### Using Deno

> tested on deno version 1.8.1

```bash
deno run --allow-read=. runner.js
```

### Using Node

> tested on node 15.11

```bash
node runner.js
```

## Contribute

```bash
# we update the librairies with deno
# and they are commited with the codebase:
deno bundle 'https://jspm.dev/mdast-util-from-markdown@0.8.5' lib/mdast.js
deno bundle 'https://deno.land/std@0.90.0/testing/asserts.ts' lib/std.assert.js

# the style is downloaded from github page markdown
curl -s "https://nan-academy.github.io/$(curl -s https://nan-academy.github.io/starter/quests/1 | rg style.css | cut -d'"' -f 4)" > lib/style.css
```

Markdown and JS files must be formatted using `prettier`

```bash
prettier -w \
  --no-semi \
  --single-quote \
  --trailing-comma all \
  --arrow-parens always \
  --prose-wrap always \
  --print-width 80 \
  quests/*.md
```
