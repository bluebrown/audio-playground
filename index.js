'use strict';

import {
    createNodeFromList,
    createHead,
    connectSelected,
    nodeList,
    removeVertex,
} from './lib.js'


const appContext = document.getElementById('app')
const ctx = new AudioContext()
window.play = () => ctx.resume()
window.pause = () => ctx.suspend()

let currentOutput = null

// a callback that is fired when a node connector is clicked.
// (the input, putout and params buttons on the ui cards)
appContext.addEventListener('audio:select', function ({ detail: payload }) {
    console.log(payload);
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

    // check if nodes are already connected and if so disconnect

    // if the current output has a vertex with input id of the payload guid
    // then the connection already exists

    let domQuery = `.vertex[data-in="${payload.guid}"]`
    if (currentOutput.index) {
        domQuery += `[data-out-index="${currentOutput.index}"]`
    }
    if (payload.index) {
        domQuery += `[data-in-index="${payload.index}"]`
    }

    const existing = document.getElementById(currentOutput.guid).querySelector(domQuery)


    if (existing) {
        currentOutput.node.disconnect(payload.node)
        removeVertex(currentOutput.guid, payload.guid, existing.dataset.vertexId)
        currentOutput = null
        return
    }

    // otherwise connect
    connectSelected(currentOutput, payload)
    currentOutput = null
}

    , false)


const ns = document.getElementById('node-select')


// generate all nodes in the list for testing
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
    appContext.insertBefore(createNodeFromList(ctx, parseInt(ns.value))[2], destHead)
}

// create some example nodes and connect them
{
    const oscHead = createNodeFromList(ctx, 0)[2]
    appContext.insertBefore(oscHead, destHead)

    const [guid, gainNode, gainHead] = createNodeFromList(ctx, 2)
    appContext.insertBefore(gainHead, destHead)

    const anaHead = createNodeFromList(ctx, 8,)[2]
    appContext.insertBefore(anaHead, destHead)

    oscHead.querySelector('.outputs button').click()
    gainHead.querySelector('.inputs button').click()

    gainHead.querySelector('.outputs button').click()
    anaHead.querySelector('.inputs button').click()

    anaHead.querySelector('.outputs button').click()
    destHead.querySelector('.inputs button').click()

    gainHead.querySelector('input[name="gain"]').value = "0.1"
    gainHead.querySelector('input.display').value = "0.1"
    gainNode.gain.value = 0.1

}