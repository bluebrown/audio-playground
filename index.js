'use strict';

(async () => {
    { // main scope
        const appContext = document.getElementById('app')
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

        {
            const [uid, osc, oscHead] = createOscillator(ctx, dispatchSelection)
            nodes[uid] = osc
            appContext.append(oscHead)
        }
        {
            const [uid, osc, oscHead] = createOscillator(ctx, dispatchSelection)
            nodes[uid] = osc
            appContext.append(oscHead)
        }
        const gain = ctx.createGain()
        const gainHead = createHead(gain, 'Gain', ['gain'], dispatchSelection)
        nodes[gainHead.id] = gain
        appContext.append(gainHead)

        const dest = ctx.destination
        const destHead = createHead(dest, 'Destination', [], dispatchSelection)
        appContext.append(destHead)

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
            console.log(inSelect.node, outSelect.index, inSelect.index)
            if (inSelect.type == 'param') {
                outSelect.node.connect(inSelect.node)
            } else {
                outSelect.node.connect(inSelect.node, outSelect.index, inSelect.index)
            }
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
        ioSection.classList = 'io'
        const leftDiv = document.createElement('div')
        const rightDiv = document.createElement('div')
        ioSection.append(leftDiv)
        ioSection.append(rightDiv)

        const heading2 = document.createElement('h2')
        heading2.textContent = 'Outputs'
        leftDiv.append(heading2)
        leftDiv.classList = 'outputs'
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
        rightDiv.classList = 'inputs'
        for (let i = 0; i < node.numberOfInputs; i++) {
            const ipBtn = document.createElement('button')
            ipBtn.id = guid()
            ipBtn.textContent = `ip ${i}`
            rightDiv.append(ipBtn)
            ipBtn.onclick = () => dispatchSelection({ node, guid: ipBtn.id, index: i, type: 'input' })
        }

        const paramsSection = document.createElement('section')
        paramsSection.classList = 'params'
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

    function rangeInput(label, value = 0, min = 0, max = 100, step = 1, onchange = console.log) {
        const controlGroup = document.createElement('div')
        controlGroup.classList = 'control-group'
        const inputLabel = document.createElement('label')
        controlGroup.append(inputLabel)
        inputLabel.for = label
        inputLabel.textContent = label
        const input = document.createElement('input')
        controlGroup.append(input)
        const valueDisplay = document.createElement('input')
        valueDisplay.classList = 'display'
        valueDisplay.value = value
        controlGroup.append(valueDisplay)
        input.name = label
        input.type = 'range'
        input.min = min
        input.max = max
        input.step = step
        input.value = value
        input.onchange = (event) => {
            valueDisplay.value = event.target.value
            onchange(event)
        }
        return controlGroup
    }

    function createOscillator(ctx, dispatchSelection) {
        const osc = ctx.createOscillator()
        osc.start()
        const oscHead = createHead(osc, 'Oscillator', ['frequency', 'detune'], dispatchSelection)
        const controlSection = document.createElement('section')
        controlSection.classList = 'controls'
        oscHead.append(controlSection)
        const ctrlHeader = document.createElement('h2')
        ctrlHeader.textContent = 'Controls'
        controlSection.append(ctrlHeader)
        const typeSelect = document.createElement('select')
        controlSection.append(typeSelect)
        for (const type of ['sine', 'square', 'sawtooth', 'triangle']) {
            const opt = document.createElement('option')
            opt.textContent = type
            opt.value = type
            typeSelect.append(opt)
        }
        typeSelect.onchange = () => {
            osc.type = typeSelect.value
        }
        controlSection.append(rangeInput('frequency', osc.frequency.value, 60, 2000, 0.1, ({ target }) => {
            const value = parseFloat(target.value)
            osc.frequency.exponentialRampToValueAtTime(value, ctx.currentTime)
        }))

        controlSection.append(rangeInput('detune', osc.detune.value, -25, 25, 1, ({ target }) => {
            const value = parseFloat(target.value)
            if (value !== 0) {
                osc.detune.exponentialRampToValueAtTime(value, ctx.currentTime)
            } else {
                osc.detune.linearRampToValueAtTime(value, ctx.currentTime)
            }
        }))

        return [oscHead.id, osc, oscHead]
    }

})().catch(console.warn)
