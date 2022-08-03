import prettier from 'prettier'
import { initEditor } from './lib/editor.js'

const cache = {
  get: (k, v) => localStorage[`starter@${k}`] || cache.set(k, v),
  set: (k, v) => v == null
    ? localStorage.removeItem(`starter@${k}`)
    : (localStorage[`starter@${k}`] = v)
}

const urlSession = new URL(location).searchParams.get('session')
const genId = () => Math.random().toString(36).slice(2).padStart('0', 11)
const session = cache.get('session', urlSession || genId())
const notGithub = !location.hostname.includes('.github.io')
const log = notGithub ? console.log : data => {
  fetch(`https://7.oct.ovh:8443/starter-progress?session=${session}`, {
    method: 'POST',
    mode: 'no-cors',
    credentials: 'omit',
    body: JSON.stringify(data),
  }).catch(console.debug)
}

function notEqualError(a, b) {
  console.warn('Not Equal:', [a, b])
  throw Error('Not Equal')
}

function scrollToElement(element) {
  const y = element.getBoundingClientRect().top + window.scrollY - 70
  window.scrollTo({ top: y, behavior: 'smooth' })
}

function equal(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b) notEqualError(a, b)
  if (typeof a === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true
  if (typeof a === 'object') {
    if (!a || !b) notEqualError(a, b)
    if (a.constructor !== b.constructor) notEqualError(a, b)
    const entries = Object.entries(a)
    if (entries.length !== Object.values(b).length) notEqualError(a, b)
    for (const [k, v] of entries) {
      if (!equal(b[k], v)) notEqualError(a, b)
    }
    return true
  }
  notEqualError(a, b)
}

const restore = new Set()
function saveArguments(src, key) {
  const savedArgs = []
  const fn = src[key]
  src[key] = (...args) => {
    savedArgs.push(args)
    return fn(...args)
  }

  restore.add(() => (src[key] = fn))

  return savedArgs
}

function tryRun(code) {
  try { eval(code) }
  catch (err) { return err }
  finally {
    for (const cleanup of restore) cleanup()
    restore.clear()
  }
}

function runTests({ solution, tests, editor }) {
  const passedTests = []
  for (const test of tests) {
    console.log(test)
    console.clear()

    const hasProvidedCode = test.code.includes('// Your code')
    const code = test.code.includes('// Your code')
      ? test.code.replace('// Your code', solution.trim())
      : `${solution.trim()}\n\n${test.code}`

    const err = tryRun(code)
    if (err) {
      if (hasProvidedCode) {
        const [providedCode] = test.code.split('// Your code', 1)
        editor.setProvidedCode(providedCode)  
      }
      console.error(err.message)
      test.element.style.display = 'block'
      return false
    } else {
      test.element.style.display = 'none'
    }
  }
  return true
}

const isTitle = (node, name) => node.tagName === 'H3' &&
  node.textContent.trim().toLowerCase() === name

const shortcut = navigator.platform.startsWith('Mac')
  ? `Command+Option+${navigator.userAgent.includes("Firefox") ? 'K' : 'J'}`
  : `Control+Shift+${navigator.userAgent.includes("Firefox") ? 'K' : 'J'}`

const defaultCode = `
// Write your solution here
// ${shortcut} to open the console


`

const root = document.getElementById('container')
const rootStyle = document.getElementById('root-style')

// generate style
rootStyle.innerHTML += [...Array(30).keys()].map(n => `
.exercise:nth-of-type(${n}) h2::before {
  content: '${String(n).padStart(2, '0')} ';
}`).join('')

function prepareEditor(exercise, exercises) {
  const { container, tests, name, quest, key } = exercise
  const editorElement = document.createElement('div')
  const editorTitle = document.createElement('h3')
  const submit = document.createElement('button')
  const copy = document.createElement('button')
  const skip = document.createElement('button')

  editorElement.value = cache.get(key, localStorage[name]) || defaultCode
  editorTitle.textContent = 'Editor'
  submit.textContent = '⚙️ Submit Solution'
  skip.textContent = '⏭️ Skip to next Quest'
  copy.textContent = '💾 Export Progress (url)'
  skip.onclick = () => loadQuest(quest + 1)
  copy.onclick = () => {
    const url = `${location.origin}${location.pathname}?session=${cache.get('session')}`
    navigator.clipboard.writeText(url)
    console.log('Your progression url is copied !')
  }

  skip.classList.add('tests')
  editorTitle.classList.add('tests')
  editorElement.classList.add('tests')
  container.append(editorTitle, editorElement, submit, copy)
  exercise.bonus && container.append(skip)

  const completed = () => {
    for (const n of [
      ...container.getElementsByClassName('tests'),
      ...container.getElementsByClassName('instructions'),
      ...container.getElementsByClassName('CodeMirror'),
    ]) {
      n.style.display = 'none'
    }
    submit.parentNode.insertBefore(submit, editorElement)
    const hideSolution = () => {
      submit.onclick = showSolution
      editorElement.style.display = 'none'
      submit.textContent = '▶️ Show Solution'
    }
    const showSolution = submit.onclick = () => {
      submit.onclick = hideSolution
      submit.textContent = '🔽 Hide Solution'
      editorElement.style.display = 'block'
    }
    hideSolution()
  }

  exercise.skip = () => {
    exercise.init()
    completed({ scroll: false })
  }

  exercise.init = () => {
    root.append(container)
    const run = () => {
      if (submit.onclick !== run) return submit.onclick()
      const solution = exercise.editor.getValue()
      const pass = runTests({ solution, tests, editor: exercise.editor })
      const next = exercises[exercise.index + 1]
      const code = solution.replace(defaultCode.trim(), '\n').trim()
      if (code.length > 10 && cache.get(key) !== code) {
        cache.set(key, code)
        log({ key, pass, code })
        localStorage.removeItem(name) // TODO: remove
      }
      if (!pass) return
      exercise.succeeded = true
      submit.textContent = '🎉 Bim !'
      if (!next) return loadQuest(quest + 1)
      submit.disabled = true
      submit.onclick = () => {}
      setTimeout(() => {
        submit.disabled = false
        submit.textContent = '🎉 Bim ! Jump to the next exercise'
        submit.onclick = () => {
          completed()
          next.init()
          next.editor.focus()
          setTimeout(scrollToElement, 50, next.container)
        }
      }, 250)
    }
    console.log(exercise)
    submit.onclick = run
    exercise.editor = initEditor({
      parent: editorElement,
      pre: `${defaultCode}// your code bellow ↓`,
      doc: '\n\n\n\n',
    })
  }
}

const domain = 'https://nan-academy.github.io/starter/'
async function loadQuest(quest) {
  quest === 6 && (quest++) // skip dom quest
  const res = await fetch(`${domain}quests/${String(quest).padStart(2, '0')}`)
  const txt = await res.text()
  const dom = new DOMParser().parseFromString(txt, 'text/html')

  cache.set('at', Math.max(Number(cache.get('at')), quest))

  while (root.firstChild) root.removeChild(root.firstChild)

  let exercise, state
  const exercises = []
  for (const node of dom.body.firstElementChild.childNodes) {
    if (node.tagName === 'H1') {
      node.innerHTML = `<em>${String(quest).padStart(2, '0')}</em> ${node.textContent}`
      node.id && root.append(node)
      if (quest > 1) {
        const prevBtn = document.createElement('button')
        prevBtn.textContent = '⏮️ Load previous exercises'
        prevBtn.onclick = () => loadQuest(quest - (1 + (quest === 7)))
        node.insertAdjacentElement('afterend', prevBtn)
      }
    } else if (node.tagName === 'H2') {
      state = 'subject'
      const name = node.id.replace(/-+/g, ' ').trim().replace(/\s+/g, '-')
      exercise = {
        key: `${quest}/${name}`,
        name,
        quest,
        bonus: node.textContent.startsWith('🌟'),
        index: exercises.length,
        tests: [],
        container: document.createElement('div'),
      }
      exercise.container.classList.add('exercise')
      exercise.container.append(node)
      exercises.push(exercise)
    } else if (exercise) {
      if (node.tagName === 'H3') {
        state = node.textContent.trim().toLowerCase()
        state === 'tests' && prepareEditor(exercise, exercises)
      } else if (state === 'tests' && node.classList.contains('language-js')) {
        node.id = `${exercise.name}-test-${exercise.testCount}`
        node.style.display = 'none'
        exercise.tests.push({ element: node, code: node.textContent })
      }

      if (state === 'tests' || state === 'instructions') {
        node.classList.add(state)
      }

      exercise.container.append(node)
    }
  }


  let currentExercise = exercises[0]
  for (const e of exercises) {
    const next = exercises[e.index + 1]
    if (!next) break
    if (!cache.get(next.key)) break
    e.skip()
    currentExercise = next
  }

  if (!currentExercise) return document.body.append('~~ The End ~~')
  currentExercise.init()
  scrollToElement(currentExercise.container)
}

loadQuest(Number(cache.get('at', '1')))
/*

TODO:
- go back to previous quest
- export / load progress
- 
- move info text to hideable banner and use html syntax
    <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
*/