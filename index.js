'use strict';

import {
    createNodeFromList,
    createHead,
    connectSelected,
    nodeList,
    getExistingVertex,
    disconnectNodes,
} from './lib.js'


const appContext = document.getElementById('app')
const ctx = new AudioContext()
window.play = () => ctx.resume()
window.pause = () => ctx.suspend()

let currentOutput = null

function message(msg, type = 'warn') {
    console.warn(msg)
    const msgEl = document.createElement('article')
    msgEl.classList = 'msg ' + type
    msgEl.textContent = msg
    document.getElementById('messages').prepend(msgEl)
    setTimeout(() => msgEl.remove(), 3000)
}

// event handler that is fired when a node connector is clicked.
// (the input, putout and params buttons on the ui cards)
appContext.addEventListener('audio:select', function ({ detail }) {
    const payload = detail.payload()
    // self imposed rules to be less confusing to the user
    if (!currentOutput) {
        if (payload.type != 'output') {
            message('must use output first')
            return
        }
        currentOutput = payload
        return
    }
    if (payload.type == 'output') {
        message('must use input or param second')
        currentOutput = null
        return
    }

    // check if nodes are already connected and if so disconnect
    const existing = getExistingVertex(currentOutput, payload)
    if (existing) {
        disconnectNodes(currentOutput, payload, existing)
        currentOutput = null
        return
    }

    // otherwise connect
    connectSelected(currentOutput, payload)
    currentOutput = null
})


// generate all nodes in the list for testing
const ns = document.getElementById('node-select')
for (const i in nodeList) {
    const opt = document.createElement('option')
    opt.value = i
    opt.textContent = nodeList[i][0]
    ns.append(opt)
}

// create audio destination
const dest = ctx.destination
const destHead = createHead(dest, 'Destination', [])
destHead.querySelector('.delete').remove()
appContext.append(destHead)

window.addNode = () => {
    appContext.append(createNodeFromList(ctx, parseInt(ns.value))[2])
}
