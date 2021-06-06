'use strict';

import {
    createNodeFromList,
    createHead,
    connectSelected,
    nodeList,
} from './lib.js'


const appContext = document.getElementById('app')
const ctx = new AudioContext()
window.play = () => ctx.resume()
window.pause = () => ctx.suspend()

let currentOutput = null

// a callback that is fired when a node connector is clicked.
// (the input, putout and params buttons on the ui cards)
function dispatchSelection(payload) {
    // self imposed rules to be less confusing to the user
    if (!currentOutput) {
        if (payload.type != 'output') {
            console.warn('must use output first')
            return
        }
        currentOutput = payload
        return
    }
    if (payload.type == 'output') {
        console.warn('must use input or param second')
        currentOutput = null
        return
    }
    connectSelected(currentOutput, payload)
    currentOutput = null
}

// hold all nodes here with a key identical to the guid in the dom
// this will prevent dereferencing and allows to know which dom element
// corresponds to which node, if ever needed
const nodes = {}

// generate all nodes in the list for testing
for (const i in nodeList) {
    const [uid, node, head] = createNodeFromList(ctx, i, dispatchSelection)
    nodes[uid] = node
    appContext.append(head)
}

// create audio destination
const dest = ctx.destination
const destHead = createHead(dest, 'Destination', [], dispatchSelection)
appContext.append(destHead)
