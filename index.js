// read input json file
const changedFiles = process.argv.slice(2);

if (changedFiles.length == 0) {
    throw new Error('There is no change.')
}

const fs = require('fs')
const path = process.env.GITHUB_ACTION_PATH || '.'
const jsonStr = fs.readFileSync(`${path}/gradle-structure.json`)
const nodes = JSON.parse(jsonStr) || []

const nodeMap = nodes.reduce((map, node) => {
    map[`:${node.id.group}:${node.id.name}:${node.id.version}`] = node
    return map
}, {})

// check changed files
const checkTree = nodes.reduce((root, node) => {
    // node가 module 그리고 다음 노드로의 프로퍼티가 있어야함
    var cursor = root
    node.path.split('/')
        .forEach((path, idx, arr) => {
            if (!path) return
            const last = (arr.length - 1) == idx

            const exist = !!cursor[path]
            if (!exist) {
                cursor[path] = {
                    module: ''
                }
            }
            cursor = cursor[path]
            if (last) {
                cursor.module = `:${node.id.group}:${node.id.name}:${node.id.version}`
            }
        })

    return root
}, {
    module: ''
})

const internalModuleSet = new Set()
const leafModuleSet = new Set()
changedFiles.forEach(file => {
    var cursor = checkTree
    var module = ''

    file.split('/').every(path => {
        if (!path) return true
        const exist = cursor[path]
        if (exist) {
            cursor = cursor[path]
        }

        if (!!cursor.module) module = cursor.module

        return exist
    })

    if (!!module) appendNodes(nodeMap[module])
})

function appendNodes(node) {
    const key = `${node.id.group}:${node.id.name}:${node.id.version}`
    if (node.dependentOn.length == 0) leafModuleSet.add(key)
    else internalModuleSet.add(`${node.id.group}:${node.id.name}:${node.id.version}`)

    node.dependentOn.forEach(child => appendNodes(child, internalModuleSet))
}

// write output file
const internal = [...internalModuleSet].join('\n')
const leaf = [...leafModuleSet].join('\n')

console.log(`${setEnvValue('LEAF_MODULES', leaf)}\n${setEnvValue('INTERNAL_MODULES', internal)}`)

// https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#multiline-strings
function setEnvValue(key, val) {
    return `${key}<<EOF
${val}
EOF`
}
