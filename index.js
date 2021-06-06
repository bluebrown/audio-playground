'use strict';

(async () => {
    // main scope
    {

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

        const stolenAnalyserCallback = (ctx, analyser, head) => {
            const canvas = document.createElement('canvas')
            head.querySelector('.controls').append(canvas)
            analyser.fftSize = 2048;
            var bufferLength = analyser.frequencyBinCount;
            var dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);
            var canvasCtx = canvas.getContext("2d");
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
        }

        const lfoOpts = {
            constructor: { frequency: 0.8 },
            params: {
                frequency: [-5.0, 5.0, 0.01],
            },
            select: [
                {
                    label: 'type',
                    items: ['sine', 'square', 'sawtooth', 'triangle'],
                }
            ]
        }

        const nodeList = [
            ['OscillatorNode', OscillatorNode, {}],
            ['LfoNode', OscillatorNode, lfoOpts],
            ['GainNode', GainNode, {}],
            ['StereoPannerNode', StereoPannerNode, {}],
            ['PannerNode', PannerNode, {}],
            ['DynamicsCompressorNode', DynamicsCompressorNode, {}],
            ['BiquadFilterNode', BiquadFilterNode, {}],
            ['AnalyserNode', AnalyserNode, { callback: stolenAnalyserCallback }],
        ]

        for (const [label, Constructor, options] of nodeList) {
            const [uid, node, head] = createNode(label, ctx, Constructor, options, dispatchSelection)
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

    function getAudioParams(node) {
        const params = []
        for (const propName in node) {
            if (node[propName] instanceof AudioParam) {
                params.push(propName)
            }
        }
        return params
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
        nodeHead.id = guid()
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
        controlGroup.append(input)
        return controlGroup
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

    function createNode(label, ctx, Constructor, options = {}, dispatchSelection = console.log) {
        // create new node by invoking the constructor
        const node = new Constructor(ctx, options.constructor || {})
        const params = getAudioParams(node)
        const head = createHead(node, label, params, dispatchSelection)

        // create control section
        const controlSection = createControlSection()
        head.append(controlSection)

        // add select options of any
        if (options.select instanceof Array) {
            for (const { label, items } of options.select) {
                controlSection.append(selectInput(label, items, ({ target }) => {
                    node.type = target.value
                }))
            }
        }

        // add param slider if any
        for (let p of params) {
            const ap = node[p]
            const pOpts = options.params && options.params[p]
            const min = pOpts ? pOpts[0] : ap.minValue
            const max = pOpts ? pOpts[1] : ap.maxValue
            const step = pOpts ? pOpts[3] : 0.1
            controlSection.append(rangeInput(p, ap.value, min, max, step, ({ target }) => {
                saveSmoothValueChange(node[p], target.value, ctx.currentTime)
            }))
        }

        if (typeof options.callback === 'function') {
            options.callback(ctx, node, head)
        }

        // start the node if required
        if (typeof node.start === 'function') {
            node.start()
        }

        // return the soup
        return [head.id, node, head]
    }

})().catch(console.warn)
