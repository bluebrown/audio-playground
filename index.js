'use strict';

(async () => {

    // main scope

    {

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

        // this was taken from the docs https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
        // it us used to graph the signal in the analyzer node
        const stolenAnalyserCallback = (ctx, analyser, head) => {
            const canvas = document.createElement('canvas')
            canvas.width = 245;
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
            constructor: { frequency: 1 },
            params: {
                frequency: [-5.0, 5.0, 0.01],
                detune: [-25, 25, 1],
            },
            select: [
                {
                    label: 'type',
                    items: ['sine', 'square', 'sawtooth', 'triangle'],
                }
            ]
        }

        // needs more specialized controls
        const waveShaperOpts = {
            select: [{ label: 'oversample', items: ['none', '2x', '4x'] }],
            callback(ctx, ws, head) {
                head.querySelector('.controls').append(rangeInput('curve', 0, 0, 100, 1, ({ target }) => {
                    ws.curve = makeDistortionCurve(target.value)
                }))
            }
        }

        const biFilterOpts = {
            select: [
                {
                    label: 'type',
                    items: [
                        'lowpass',
                        'highpass',
                        'bandpass',
                        'lowshelf',
                        'highshelf',
                        'peaking',
                        'notch',
                        'allpass'
                    ]
                }
            ]
        }

        // node list from which nodes with defaults settings and ui head can be generates
        // the first items is the label on the ui card
        // the second item is the node contractor that will be invoked
        // the third item is an object of options
        // it can contain a
        // -  'constructor' options object
        // - 'params' options to set param slider
        // - 'select' array of object with select inputs options
        const nodeList = [
            ['OscillatorNode', OscillatorNode, { select: lfoOpts.select }],
            ['LfoNode', OscillatorNode, lfoOpts],
            ['GainNode', GainNode, { params: { gain: [0, 2, 0.1] } }],
            ['StereoPannerNode', StereoPannerNode, {}],
            ['PannerNode', PannerNode, {}],
            ['DynamicsCompressorNode', DynamicsCompressorNode, {}],
            ['BiquadFilterNode', BiquadFilterNode, biFilterOpts],
            ['WaveShaperNode', WaveShaperNode, waveShaperOpts],
            ['AnalyserNode', AnalyserNode, { callback: stolenAnalyserCallback }],
        ]

        // generate all nodes in the list for testing
        for (const [label, Constructor, options] of nodeList) {
            const [uid, node, head] = createNode(label, ctx, Constructor, options, dispatchSelection)
            nodes[uid] = node
            appContext.append(head)
        }

        // create audio destination
        const dest = ctx.destination
        const destHead = createHead(dest, 'Destination', [], dispatchSelection)
        appContext.append(destHead)

    }


    // library code

    // create random guid for element refs
    function guid() {
        const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    }

    // create random color to show connected nodes
    function randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    // get audio params of a given node in order to 
    // initialize the ui head with io and params slider
    function getAudioParams(node) {
        const params = []
        for (const propName in node) {
            if (node[propName] instanceof AudioParam) {
                params.push(propName)
            }
        }
        return params
    }

    // mark connected nodes with random color badge
    // by finding th elements with the guid in the dom
    function appendVertexBadge(ctx, colo, inGuid, outGuid) {
        const vertex = document.createElement('span')
        vertex.style.backgroundColor = colo
        vertex.classList = 'vertex'
        vertex.dataset.in = inGuid
        vertex.dataset.out = outGuid
        ctx.append(vertex)
    }

    // try to connect the provided nodes and visualize in the dom
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

    // create ui head for a given node and attack selection callback to controls
    function createHead(node, label = '', params = [], dispatchSelection = console.log) {
        // create new article with and asign guid as id
        const nodeHead = document.createElement('article')
        nodeHead.id = guid()
        nodeHead.classList = 'node-head'
        const heading = document.createElement('h1')
        heading.textContent = label
        nodeHead.append(heading)

        // input output section
        const ioSection = document.createElement('section')
        nodeHead.append(ioSection)
        ioSection.classList = 'io'
        const leftDiv = document.createElement('div')
        const rightDiv = document.createElement('div')

        // switched around. don't be mad at me
        ioSection.append(rightDiv)
        ioSection.append(leftDiv)

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

        // parameter section
        const paramsSection = document.createElement('section')
        paramsSection.classList = 'params'
        nodeHead.append(paramsSection)

        const heading4 = document.createElement('h2')
        heading4.textContent = 'Params'
        paramsSection.append(heading4)
        for (let i = 0; i < params.length; i++) {
            let param = params[i]
            const prBtn = document.createElement('button')
            prBtn.id = guid()
            prBtn.textContent = `${param}`
            paramsSection.append(prBtn)
            prBtn.onclick = () => dispatchSelection({ node: node[param], guid: prBtn.id, type: 'param' })
        }

        return nodeHead
    }

    // create a new range input that is used for the node head controls
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

    // create a new select input that is used for the ui head controls
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

    // create wrapper for individual control elements
    // mainly useful for css purposes
    function createControlSection() {
        const controlSection = document.createElement('section')
        controlSection.classList = 'controls'
        const ctrlHeader = document.createElement('h2')
        ctrlHeader.textContent = 'Controls'
        controlSection.append(ctrlHeader)
        return controlSection
    }

    // try to ramp the value exponentially unless it is 0 then do it linear
    function saveSmoothValueChange(audioParam, value, time) {
        value = parseFloat(value)
        if (value !== 0) {
            audioParam.exponentialRampToValueAtTime(value, time)
        } else {
            audioParam.linearRampToValueAtTime(value, time)
        }
    }

    // create a new node and bind ui head head 
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
            const step = pOpts ? pOpts[2] : 0.1
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

    // sigmoid distortion from https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode
    function makeDistortionCurve(amount = 20, n_samples = 256) {
        let curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            let x = i * 2 / n_samples - 1;
            curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }


})().catch(console.warn)
