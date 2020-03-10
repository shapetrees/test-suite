function tables (lookFor) {
  const lookReg = new RegExp(`^${lookFor}: (.*)`)
  return Array.from(document.querySelectorAll('div table'))
    .map(table => {
      const x = table.parentElement.querySelector('h3')
      const y = x ? x.textContent.match(lookReg) : x
      return [x && y ? y[1] : null, table]
    })
    .filter(pair => pair[0])
    .map(pair => {
      const table = pair[1]
      return [pair[0], Array.from(table.querySelectorAll('tr'))
        .filter(tr => {
          return tr.children[0].tagName !== 'TH'
        })
        .map(tr => {
          const chil = Array.from(tr.children)
          const prop = chil[0].innerText
          const type = chil[1].innerText
          return [prop, type]
        })
      ]
    })
}

function type (t) {
  const m = t.match(/list<(.*?)>/)
  if (m) return `@<#listOf${m[1]}>`
  if (t.match(/[A-Z]/)) return `@<#${t}>`
  if (t.match(/^i[0-9]+$/)) return `xsd:integer`
  if (t === 'bool') return `xsd:boolean`
  if (['string', 'double'].indexOf(t) !== -1) return `xsd:${t}`
  console.warn(`what's ${t}?`)
  return t
}

shapes = tables('Struct')
shapes.map(r => `<#${r[0]}> {
${r[1].map(p => `  :${p[0]} ${type(p[1])} ;`).join("\n")}
}`).join('\n\n')

enums = tables('Enumeration')
enums.map(r => `<#${r[0]}> [
${r[1].map(p => `  :${p[0]} ; # ${type(p[1])}`).join("\n")}
]`).join('\n\n')

