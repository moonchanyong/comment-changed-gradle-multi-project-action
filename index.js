// read input json file
const args = process.argv.slice(2);
if (args.length == 0) {
    throw new Error('Gradle structure is not passed.')
}

const fs = require('fs')
const changedFiles = String(args[0]).split('\n')
const jsonStr = fs.readFileSync('./gradle-structure.json')
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

const retSet = new Set()
changedFiles.forEach(file => {
    var cursor = checkTree
    var lastModule = ''

    file.split('/').every(path => {
        if (!path) return true
        const exist = cursor[path]
        if (exist) {
            cursor = cursor[path]
        }

        if (!!cursor.module) lastModule = cursor.module

        return exist
    })

    if (!!lastModule) appendNodes(nodeMap[lastModule], retSet)
})

function appendNodes(node, retSet) {
    retSet.add(`:${node.id.group}:${node.id.name}:${node.id.version}`)
    node.dependentOn.forEach(child => appendNodes(child, retSet))
}

// write output file
const out = [...retSet].join('\n')

console.log(out)
