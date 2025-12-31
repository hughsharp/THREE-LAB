export function createUI({
    material,
    bloomPass,
    TWEEN,
    MORPH_DURATION,
    DEFAULT_VIBRATE_AMPLITUDE,
    DEFAULT_SIZE_THRESHOLD,
    DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD,
    POINT_SIZE,
    UI_WIDTH,
    UI_TOP,
    UI_RIGHT,
    speed,
    hoverEffect,
    mouseDamping,
    pointReturnSpeed,
    onStart,
    onComplete
}) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = UI_TOP;
    container.style.right = UI_RIGHT;
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.color = 'white';
    container.style.fontFamily = 'sans-serif';
    container.style.width = UI_WIDTH;
    container.style.zIndex = '100'; // Ensure UI is above canvas

    // Header with Morph button (always visible) and a collapse toggle
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';

    const headerLabel = document.createElement('div');
    headerLabel.innerText = 'Controls';
    headerLabel.style.fontWeight = 'bold';
    headerLabel.style.fontSize = '14px';
    headerLabel.style.color = 'white';

    const headerRight = document.createElement('div');
    headerRight.style.display = 'flex';
    headerRight.style.gap = '8px';
    headerRight.style.alignItems = 'center';

    // Collapse toggle (start collapsed)
    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.innerText = 'Show';
    collapseBtn.style.fontSize = '12px';
    collapseBtn.style.padding = '4px 8px';
    collapseBtn.style.cursor = 'pointer';
    collapseBtn.style.background = '#222';
    collapseBtn.style.color = 'white';
    collapseBtn.style.border = '1px solid #444';
    collapseBtn.style.borderRadius = '4px';

    // Placeholder where the Morph button will be inserted so it remains visible
    const headerMorphContainer = document.createElement('div');

    headerRight.appendChild(headerMorphContainer);
    headerRight.appendChild(collapseBtn);

    header.appendChild(headerLabel);
    header.appendChild(headerRight);

    container.appendChild(header);

    // Content area containing the sliders and controls. Collapsed by default.
    const content = document.createElement('div');
    content.style.display = 'none';
    container.appendChild(content);

    // Collapse button behavior
    collapseBtn.addEventListener('click', () => {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            collapseBtn.innerText = 'Hide';
        } else {
            content.style.display = 'none';
            collapseBtn.innerText = 'Show';
        }
    });

    const title = document.createElement('div');
    title.innerText = "Light Direction";
    title.style.marginBottom = "10px";
    title.style.fontWeight = "bold";
    content.appendChild(title);

    // Helper to create slider. Initializes from the material uniform if present
    const createSlider = (label, axis) => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '5px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        // read initial value from material uniform if available
        let initialVal = 1.0;
        if (material && material.uniforms && material.uniforms.uLightDir) {
            initialVal = material.uniforms.uLightDir.value[axis];
        }

        const text = document.createElement('span');
        text.innerText = `${label}: ${initialVal.toFixed(1)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '-100.0';
        number.max = '100.0';
        number.step = '0.1';
        number.value = initialVal.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        // Reset button restores the initial value
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initialVal));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '-100.0';
        input.max = '100.0';
        input.step = '0.1';
        input.value = initialVal.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(val) {
            const v = parseFloat(val) || 0;
            text.innerText = `${label}: ${v.toFixed(1)}`;
            number.value = v;
            input.value = v;
            if (material && material.uniforms && material.uniforms.uLightDir) {
                material.uniforms.uLightDir.value[axis] = v;
            }
        }

        input.addEventListener('input', (e) => {
            setValue(e.target.value);
        });

        number.addEventListener('input', (e) => {
            setValue(e.target.value);
        });

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    };  // end createSlider

    createSlider("X", "x");
    createSlider("Y", "y");
    createSlider("Z", "z");

    // Model Offset Control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '15px';

        const title = document.createElement('div');
        title.innerText = "Model Offset (Screen)";
        title.style.marginBottom = "5px";
        title.style.fontWeight = "bold";
        wrapper.appendChild(title);

        const createOffsetSlider = (label, axis) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '5px';

            let initialVal = 0.0;
            if (material && material.uniforms && material.uniforms.uModelOffset) {
                initialVal = material.uniforms.uModelOffset.value[axis];
            }

            const text = document.createElement('span');
            text.innerText = `${label}: ${initialVal.toFixed(2)}`;
            text.style.fontSize = '12px';

            const number = document.createElement('input');
            number.type = 'number';
            number.min = '-1.0';
            number.max = '1.0';
            number.step = '0.01';
            number.value = initialVal.toString();
            number.style.width = '70px';
            number.style.marginLeft = '8px';

            row.appendChild(text);
            row.appendChild(number);

            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.innerText = 'Reset';
            resetBtn.style.marginLeft = '6px';
            resetBtn.style.fontSize = '11px';
            resetBtn.style.padding = '2px 6px';
            resetBtn.addEventListener('click', () => setValue(0.0));
            row.appendChild(resetBtn);

            const input = document.createElement('input');
            input.type = 'range';
            input.min = '-1.0';
            input.max = '1.0';
            input.step = '0.01';
            input.value = initialVal.toString();
            input.style.width = '100%';
            input.style.cursor = 'pointer';

            function setValue(val) {
                const v = parseFloat(val) || 0;
                text.innerText = `${label}: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
                if (material && material.uniforms && material.uniforms.uModelOffset) {
                    material.uniforms.uModelOffset.value[axis] = v;
                }
            }

            input.addEventListener('input', (e) => setValue(e.target.value));
            number.addEventListener('input', (e) => setValue(e.target.value));

            wrapper.appendChild(row);
            wrapper.appendChild(input);
        };

        createOffsetSlider("X", "x");
        createOffsetSlider("Y", "y");

        content.appendChild(wrapper);
    })();

    // Light strength control (uLightStrength)
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        // initialize from material uniform when present
        let initial = 1.0;
        if (material && material.uniforms && material.uniforms.uLightStrength) initial = material.uniforms.uLightStrength.value;

        const text = document.createElement('span');
        text.innerText = `Light Strength: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '10.0';
        number.step = '0.01';
        number.value = initial.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        // Reset button for Light Strength
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initial));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '10.0';
        input.step = '0.01';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Light Strength: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uLightStrength) material.uniforms.uLightStrength.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Light size boost control (uLightSizeBoost) - scale points exposed to light
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        // initialize from material uniform when present
        let initialBoost = 1.5;
        if (material && material.uniforms && material.uniforms.uLightSizeBoost) initialBoost = material.uniforms.uLightSizeBoost.value;

        const text = document.createElement('span');
        text.innerText = `Light Size Boost: ${initialBoost.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '10.0';
        number.step = '0.01';
        number.value = initialBoost.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        // Reset button for Light Size Boost
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initialBoost));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '10.0';
        input.step = '0.01';
        input.value = initialBoost.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Light Size Boost: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uLightSizeBoost) material.uniforms.uLightSizeBoost.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Point size control (uSize)
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const text = document.createElement('span');
        text.innerText = `Point Size: ${POINT_SIZE.toFixed(3)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.001';
        number.max = '0.01';
        number.step = '0.0001';
        number.value = POINT_SIZE.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(POINT_SIZE));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '0.2';
        input.step = '0.001';
        input.value = POINT_SIZE.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Point Size: ${val.toFixed(3)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uSize) material.uniforms.uSize.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Size Threshold control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uSizeThreshold) ? material.uniforms.uSizeThreshold.value : DEFAULT_SIZE_THRESHOLD;

        const text = document.createElement('span');
        text.innerText = `Size Threshold: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '100.0';
        number.step = '0.1';
        number.value = initial.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initial));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '100.0';
        input.step = '0.1';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Size Threshold: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uSizeThreshold) material.uniforms.uSizeThreshold.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Vibration boost threshold control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uVibrateBoostSizeThreshold) ? material.uniforms.uVibrateBoostSizeThreshold.value : DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD;

        const text = document.createElement('span');
        text.innerText = `Vibrate Boost Size: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '100.0';
        number.step = '0.1';
        number.value = initial.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initial));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '100.0';
        input.step = '0.1';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Vibrate Boost Size: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uVibrateBoostSizeThreshold) material.uniforms.uVibrateBoostSizeThreshold.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Pixel ratio control
    (() => {
        const defaultPR = (material && material.uniforms && material.uniforms.uPixelRatio) ? material.uniforms.uPixelRatio.value : 1.0;
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const text = document.createElement('span');
        text.innerText = `Pixel Ratio: ${defaultPR.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.5';
        number.max = '4.0';
        number.step = '0.01';
        number.value = defaultPR.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(defaultPR));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.5';
        input.max = '4.0';
        input.step = '0.01';
        input.value = defaultPR.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Pixel Ratio: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uPixelRatio) material.uniforms.uPixelRatio.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Vibration amplitude slider
    const vibWrapper = document.createElement('div');
    vibWrapper.style.marginTop = '10px';

    const vibText = document.createElement('span');
    let initialVib = DEFAULT_VIBRATE_AMPLITUDE;
    if (material && material.uniforms && material.uniforms.uVibrateAmp) initialVib = material.uniforms.uVibrateAmp.value;
    vibText.innerText = `Vibration: ${initialVib.toFixed(2)}`;
    vibText.style.fontSize = '12px';

    const vibInput = document.createElement('input');
    vibInput.type = 'range';
    vibInput.min = '0.0';
    vibInput.max = '5.0';
    vibInput.step = '0.01';
    vibInput.value = initialVib.toString();
    vibInput.style.width = '100%';
    vibInput.style.cursor = 'pointer';

    const vibRow = document.createElement('div');
    vibRow.style.display = 'flex';
    vibRow.style.alignItems = 'center';
    vibRow.style.justifyContent = 'space-between';

    const vibNumber = document.createElement('input');
    vibNumber.type = 'number';
    vibNumber.min = '0.0';
    vibNumber.max = '5.0';
    vibNumber.step = '0.01';
    vibNumber.value = initialVib.toString();
    vibNumber.style.width = '70px';
    vibNumber.style.marginLeft = '8px';

    vibRow.appendChild(vibText);
    vibRow.appendChild(vibNumber);

    const vibReset = document.createElement('button');
    vibReset.type = 'button';
    vibReset.innerText = 'Reset';
    vibReset.style.marginLeft = '6px';
    vibReset.style.fontSize = '11px';
    vibReset.style.padding = '2px 6px';
    vibReset.addEventListener('click', () => setVib(initialVib));
    vibRow.appendChild(vibReset);

    function setVib(val) {
        const v = parseFloat(val) || 0;
        vibText.innerText = `Vibration: ${v.toFixed(2)}`;
        vibNumber.value = v;
        vibInput.value = v;
        if (material && material.uniforms && material.uniforms.uVibrateAmp) material.uniforms.uVibrateAmp.value = v;
    }

    vibInput.addEventListener('input', (e) => {
        setVib(e.target.value);
    });

    vibNumber.addEventListener('input', (e) => {
        setVib(e.target.value);
    });

    vibWrapper.appendChild(vibRow);
    vibWrapper.appendChild(vibInput);
    content.appendChild(vibWrapper);

    // Mouse Damping control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = mouseDamping ? mouseDamping.value : 0.15;

        const text = document.createElement('span');
        text.innerText = `Mouse Damping: ${initial.toFixed(3)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.001';
        number.max = '0.5';
        number.step = '0.001';
        number.value = initial.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initial));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.001';
        input.max = '0.5';
        input.step = '0.001';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0.001;
            text.innerText = `Mouse Damping: ${val.toFixed(3)}`;
            number.value = val;
            input.value = val;
            if (mouseDamping) mouseDamping.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Point Return Speed control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = pointReturnSpeed ? pointReturnSpeed.value : 0.08;

        const text = document.createElement('span');
        text.innerText = `Point Return Speed: ${initial.toFixed(3)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.001';
        number.max = '0.3';
        number.step = '0.001';
        number.value = initial.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initial));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.001';
        input.max = '0.3';
        input.step = '0.001';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0.001;
            text.innerText = `Point Return Speed: ${val.toFixed(3)}`;
            number.value = val;
            input.value = val;
            if (pointReturnSpeed) pointReturnSpeed.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();



    // Morphing toggle button
    const morphBtn = document.createElement('button');
    morphBtn.type = 'button';
    morphBtn.innerText = 'Morph: Off';
    morphBtn.style.padding = '6px 12px';
    morphBtn.style.backgroundColor = '#333';
    morphBtn.style.color = 'white';
    morphBtn.style.border = '1px solid #666';
    morphBtn.style.borderRadius = '4px';
    morphBtn.style.cursor = 'pointer';
    morphBtn.style.fontSize = '12px';

    let activeTween = null;

    morphBtn.addEventListener('click', () => {
        if (activeTween) {
            activeTween.stop();
        }

        const currentProgress = material.uniforms.uProgress.value;
        const targetProgress = currentProgress > 0.5 ? 0.0 : 1.0;
        const duration = MORPH_DURATION;

        console.log(material.uniforms)

        activeTween = new TWEEN.Tween({ progress: currentProgress })
            .to({ progress: targetProgress }, duration)
            .easing(TWEEN.Easing.Cubic.InOut)
            .onUpdate((obj) => {
                material.uniforms.uProgress.value = obj.progress;
            })
            .onStart(() => {
                if (onStart) onStart();
            })
            .onComplete(() => {
                morphBtn.innerText = (material.uniforms.uProgress.value > 0.5) ? 'Morph: On' : 'Morph: Off';
                activeTween = null;
                if (onComplete) onComplete();
            })
            .start();
    });

    // place morph button in header so it's always visible
    headerMorphContainer.appendChild(morphBtn);

    document.body.appendChild(container);
}

