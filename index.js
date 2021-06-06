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
        {
            const [uid, node, head] = createAnalyzer(ctx, dispatchSelection)
            nodes[uid] = node
            appContext.append(head)
        }
        {
            const [uid, node, head] = createDelay(ctx, dispatchSelection)
            nodes[uid] = node
            appContext.append(head)
        }
        {
            const [uid, node, head] = createStereoPanner(ctx, dispatchSelection)
            nodes[uid] = node
            appContext.append(head)
        }
        {
            const [uid, node, head] = createBiquadFilter(ctx, dispatchSelection)
            nodes[uid] = node
            appContext.append(head)
        }
        {
            const [uid, node, head] = createCompressor(ctx, dispatchSelection)
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
            let param = params[i]
            if (typeof param !== 'string') {
                param = param[0]
            }
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

    function createGenericNode(ctx, label, node, params, dispatchSelection) {
        const head = createHead(node, label, params, dispatchSelection)
        const controlSection = createControlSection()
        head.append(controlSection)
        for (let p of params) {
            let min, max, step
            if (typeof p === 'string') {
                min = node[p].minValue
                max = node[p].maxValue
                step = 0.1
            } else {
                min = p[1]
                max = p[2]
                step = p[3]
                p = p[0]
            }
            controlSection.append(rangeInput(p, node[p].value, min, max, step, ({ target }) => {
                saveSmoothValueChange(node[p], target.value, ctx.currentTime)
            }))
        }
        return [head.id, node, head]
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

    function createAnalyzer(ctx, dispatchSelection) {
        const analyser = ctx.createAnalyser();
        const head = createHead(analyser, 'Analyzer', [], dispatchSelection)
        const controlSection = createControlSection()
        head.append(controlSection)
        const canvas = document.createElement('canvas')
        head.append(canvas)

        analyser.fftSize = 2048;

        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        var canvasCtx = canvas.getContext("2d");

        // draw an oscilloscope of the current audio source

        function draw() {

            requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = "rgb(200, 200, 200)";
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = "rgb(0, 0, 0)";

            canvasCtx.beginPath();

            var sliceWidth = canvas.width * 1.0 / bufferLength;
            var x = 0;

            for (var i = 0; i < bufferLength; i++) {

                var v = dataArray[i] / 128.0;
                var y = v * canvas.height / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        }

        draw();

        return [head.id, analyser, head]

    }

    function createGain(ctx, dispatchSelection) {
        return createGenericNode(
            ctx,
            'Gain',
            ctx.createGain(),
            [['gain', 0, 1, 0.1]],
            dispatchSelection
        )
    }

    function createDelay(ctx, dispatchSelection) {
        return createGenericNode(
            ctx,
            'Delay',
            ctx.createDelay(),
            ['delayTime'],
            dispatchSelection
        )
    }

    function createStereoPanner(ctx, dispatchSelection) {
        return createGenericNode(
            ctx,
            'Stereo Pan',
            ctx.createStereoPanner(),
            ['pan'],
            dispatchSelection
        )
    }

    function createBiquadFilter(ctx, dispatchSelection) {
        return createGenericNode(
            ctx,
            'Biquad Filter',
            ctx.createBiquadFilter(),
            ['Q', 'detune', 'frequency', 'gain'],
            dispatchSelection
        )
    }

    function createCompressor(ctx, dispatchSelection) {
        return createGenericNode(
            ctx,
            'Compressor',
            ctx.createDynamicsCompressor(),
            ['attack', 'knee', 'ratio', 'release', 'threshold'],
            dispatchSelection
        )
    }

})().catch(console.warn)
