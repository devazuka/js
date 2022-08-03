import { readdir, writeFile, readFile } from 'node:fs/promises'
import {read} from 'to-vfile'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

const generateQuestHTML = (await readdir('quests')).map(async name => {
  const vfile = await read(`quests/${name}`)
  const html = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(vfile)

  await writeFile(`public/quests/${name.slice(0, -3)}.html`, html.value)
})

const publish = async file => 
  writeFile(`public/${file}`, await readFile(file))

await Promise.all([
  publish('index.html'),
  publish('logs.html'),
  ...generateQuestHTML,
])
