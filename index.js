'use strict';

(() => {
    { // main scope
        const ctx = new AudioContext()
        window.play = () => ctx.resume()
        window.pause = () => ctx.suspend()

        let currentOutput = null

        function dispatchSelection(payload) {
            if (!currentOutput) {
                if (payload.type != 'output') {
                    console.warn('must use output first')
                    return
                }
                currentOutput = payload
                return
            }
            connectSelected(currentOutput, payload)
            currentOutput = null
        }

        const nodes = {}

        const osc = ctx.createOscillator()
        osc.start()
        const oscHead = createHead(osc, 'Oscillator', ['frequency', 'detune'], dispatchSelection)
        nodes[oscHead.id] = osc
        document.body.append(oscHead)

        const gain = ctx.createGain()
        const gainHead = createHead(gain, 'Gain', [], dispatchSelection)
        nodes[gainHead.id] = gain
        document.body.append(gainHead)
    }


    function guid() {
        const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    }

    function randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    function createHead(node, label = '', params = [], dispatchSelection = console.log) {
        const nodeHead = document.createElement('article')
        nodeHead.guid = guid()
        nodeHead.classList = 'node-head'
        const heading = document.createElement('h1')
        heading.textContent = label
        nodeHead.append(heading)
        for (let i = 0; i < node.numberOfOutputs; i++) {
            const opBtn = document.createElement('button')
            opBtn.id = guid()
            opBtn.textContent = `op ${i}`
            nodeHead.append(opBtn)
            opBtn.onclick = () => dispatchSelection({ node, guid: opBtn.id, index: i, type: 'output' })
        }
        for (let i = 0; i < node.numberOfInputs; i++) {
            const ipBtn = document.createElement('button')
            ipBtn.id = guid()
            ipBtn.textContent = `ip ${i}`
            nodeHead.append(ipBtn)
            ipBtn.onclick = () => dispatchSelection({ node, guid: ipBtn.id, index: i, type: 'input' })

        }
        for (let i = 0; i < params.length; i++) {
            const param = params[i]
            const prBtn = document.createElement('button')
            prBtn.id = guid()
            prBtn.textContent = `pr ${param}`
            nodeHead.append(prBtn)
            prBtn.onclick = () => dispatchSelection({ node: node[param], guid: prBtn.id, type: 'param' })
        }
        return nodeHead
    }

    function connectSelected(outSelect, inSelect) {
        console.log({ outSelect, inSelect });
        try {
            outSelect.node.connect(inSelect.node)
            const inEl = document.getElementById(inSelect.guid);
            const outEl = document.getElementById(outSelect.guid);
            const colo = randomColor()
            console.log({ outEl, inEl, colo });
            inEl.style.backgroundColor = colo
            outEl.style.backgroundColor = colo
        }
        catch (err) {
            console.warn(err.message)
        }
    }
})()
