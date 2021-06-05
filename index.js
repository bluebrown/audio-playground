'use strict';

(async () => {
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
            if (payload.type == 'output') {
                console.warn('must use input or param')
                currentOutput = null
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
        const gainHead = createHead(gain, 'Gain', ['gain'], dispatchSelection)
        nodes[gainHead.id] = gain
        document.body.append(gainHead)

        const dest = ctx.destination
        const destHead = createHead(dest, 'Destination', [], dispatchSelection)
        document.body.append(destHead)

    }


    function guid() {
        const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    }

    function randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    function appendVertexBadge(ctx, colo, inGuid, outGuid) {
        const vertex = document.createElement('span')
        vertex.style.backgroundColor = colo
        vertex.classList = 'vertex'
        vertex.dataset.in = inGuid
        vertex.dataset.out = outGuid
        ctx.append(vertex)
    }

    function connectSelected(outSelect, inSelect) {
        try {
            outSelect.node.connect(inSelect.node, outSelect.index, inSelect.index)
            const colo = randomColor()
            const inEl = document.getElementById(inSelect.guid);
            const outEl = document.getElementById(outSelect.guid);
            appendVertexBadge(inEl, colo, inEl.id, outEl.id)
            appendVertexBadge(outEl, colo, inEl.id, outEl.id)
        }
        catch (err) {
            console.warn(err.message)
        }
    }

    function createHead(node, label = '', params = [], dispatchSelection = console.log) {
        const nodeHead = document.createElement('article')
        nodeHead.guid = guid()
        nodeHead.classList = 'node-head'
        const heading = document.createElement('h1')
        heading.textContent = label
        nodeHead.append(heading)

        const ioSection = document.createElement('section')
        nodeHead.append(ioSection)
        const leftDiv = document.createElement('div')
        const rightDiv = document.createElement('div')
        ioSection.append(leftDiv)
        ioSection.append(rightDiv)

        const heading2 = document.createElement('h2')
        heading2.textContent = 'Outputs'
        leftDiv.append(heading2)
        for (let i = 0; i < node.numberOfOutputs; i++) {
            const opBtn = document.createElement('button')
            opBtn.id = guid()
            opBtn.textContent = `op ${i}`
            leftDiv.append(opBtn)
            opBtn.onclick = () => dispatchSelection({ node, guid: opBtn.id, index: i, type: 'output' })
        }

        const heading3 = document.createElement('h2')
        heading3.textContent = 'Inputs'
        rightDiv.append(heading3)
        for (let i = 0; i < node.numberOfInputs; i++) {
            const ipBtn = document.createElement('button')
            ipBtn.id = guid()
            ipBtn.textContent = `ip ${i}`
            rightDiv.append(ipBtn)
            ipBtn.onclick = () => dispatchSelection({ node, guid: ipBtn.id, index: i, type: 'input' })
        }

        const paramsSection = document.createElement('section')
        nodeHead.append(paramsSection)

        const heading4 = document.createElement('h2')
        heading4.textContent = 'Params'
        paramsSection.append(heading4)
        for (let i = 0; i < params.length; i++) {
            const param = params[i]
            const prBtn = document.createElement('button')
            prBtn.id = guid()
            prBtn.textContent = `pr ${param}`
            paramsSection.append(prBtn)
            prBtn.onclick = () => dispatchSelection({ node: node[param], guid: prBtn.id, type: 'param' })
        }

        return nodeHead
    }

})().catch(console.warn)
