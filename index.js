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
            const [uid, node, head] = createOscillator(ctx, dispatchSelection)
            nodes[uid] = node
            appContext.append(head)
        }
        {
            const [uid, node, head] = createOscillator(ctx, dispatchSelection, true)
            nodes[uid] = node
            appContext.append(head)
        }
        {
            const [uid, node, head] = createGain(ctx, dispatchSelection)
            nodes[uid] = node
            appContext.append(head)
        }

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
            opBtn.textContent = `${i}`
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
            ipBtn.textContent = `${i}`
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
            prBtn.textContent = `${param}`
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

    function selectInput(label, options, onchange = console.log) {
        const controlGroup = document.createElement('div')
        controlGroup.classList = 'control-group'
        const inputLabel = document.createElement('label')
        controlGroup.append(inputLabel)
        inputLabel.for = label
        inputLabel.textContent = label
        const input = document.createElement('select')
        for (const type of options) {
            const opt = document.createElement('option')
            opt.textContent = type
            opt.value = type
            input.append(opt)
        }
        input.onchange = onchange
        return input
    }

    function createControlSection() {
        const controlSection = document.createElement('section')
        controlSection.classList = 'controls'
        const ctrlHeader = document.createElement('h2')
        ctrlHeader.textContent = 'Controls'
        controlSection.append(ctrlHeader)
        return controlSection
    }

    function saveSmoothValueChange(audioParam, value, time) {
        value = parseFloat(value)
        if (value !== 0) {
            audioParam.exponentialRampToValueAtTime(value, time)
        } else {
            audioParam.linearRampToValueAtTime(value, time)
        }
    }

    function createOscillator(ctx, dispatchSelection, lfo = false) {
        const osc = ctx.createOscillator()
        if (lfo) {
            osc.frequency.value = 0.1
        }
        osc.start()
        const oscHead = createHead(osc, lfo ? 'LFO' : 'Oscillator', ['frequency', 'detune'], dispatchSelection)

        const controlSection = createControlSection()
        oscHead.append(controlSection)

        controlSection.append(selectInput('type', ['sine', 'square', 'sawtooth', 'triangle'], ({ target }) => {
            osc.type = target.value
        }))

        const min = lfo ? -10 : 60
        const max = lfo ? 10 : 2200
        const step = lfo ? 0.01 : 0.1

        controlSection.append(rangeInput('frequency', osc.frequency.value, min, max, step, ({ target }) => {
            saveSmoothValueChange(osc.frequency, target.value, ctx.currentTime)

        }))

        controlSection.append(rangeInput('detune', osc.detune.value, -25, 25, 1, ({ target }) => {
            saveSmoothValueChange(osc.detune, target.value, ctx.currentTime)
        }))

        return [oscHead.id, osc, oscHead]
    }


    function createGain(ctx, dispatchSelection) {
        const gain = ctx.createGain()
        const gainHead = createHead(gain, 'Gain', ['gain'], dispatchSelection)

        const controlSection = createControlSection()
        gainHead.append(controlSection)

        controlSection.append(rangeInput('gain', gain.gain.value, 0, 1, 0.1, ({ target }) => {
            saveSmoothValueChange(gain.gain, target.value, ctx.currentTime)

        }))

        return [gainHead.id, gain, gainHead]
    }

})().catch(console.warn)
