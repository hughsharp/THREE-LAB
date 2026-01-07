import { getBackInOut, BACK_IN_OUT_DEFAULT, BACK_OUT_DEFAULT } from '../utils/customTween.js';

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
    const uiUpdates = []; // Store functions to sync UI with state

    function highlightIfChanged(input, current, initial) {
        if (Math.abs(current - initial) > 0.0001) {
            input.style.backgroundColor = '#ff9800'; // Orange
            input.style.color = '#000';
        } else {
            input.style.backgroundColor = ''; // Reset to default
            input.style.color = '';
        }
    }

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
    container.style.maxHeight = '80vh';
    container.style.overflowY = 'auto';
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

    // Force Update Button
    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.innerText = 'Ref';
    refreshBtn.title = "Force Update Sliders";
    refreshBtn.style.fontSize = '12px';
    refreshBtn.style.padding = '4px 8px';
    refreshBtn.style.cursor = 'pointer';
    refreshBtn.style.background = '#222';
    refreshBtn.style.color = 'white';
    refreshBtn.style.border = '1px solid #444';
    refreshBtn.style.borderRadius = '4px';

    refreshBtn.addEventListener('click', () => {
        uiUpdates.forEach(fn => fn());
    });

    headerRight.appendChild(headerMorphContainer);
    headerRight.appendChild(refreshBtn);
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
            // Update all UI elements when showing
            uiUpdates.forEach(fn => fn());
        } else {
            content.style.display = 'none';
            collapseBtn.innerText = 'Show';
        }
    });

    // --- 1. MODEL CONTROLS ---
    const modelTitle = document.createElement('div');
    modelTitle.innerText = "Model Controls";
    modelTitle.style.marginBottom = "10px";
    modelTitle.style.fontWeight = "bold";
    content.appendChild(modelTitle);

    // Model Scale Control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        let initialVal = 1.0;
        if (material && material.uniforms && material.uniforms.uModelScale) {
            initialVal = material.uniforms.uModelScale.value;
        }

        const text = document.createElement('span');
        text.innerText = `Model Scale: ${initialVal.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.1';
        number.max = '5.0';
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
        resetBtn.addEventListener('click', () => setValue(1.0));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.1';
        input.max = '5.0';
        input.step = '0.01';
        input.value = initialVal.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uModelScale) {
                const v = material.uniforms.uModelScale.value;
                text.innerText = `Model Scale: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(val) {
            const v = parseFloat(val) || 1.0;
            text.innerText = `Model Scale: ${v.toFixed(2)}`;
            number.value = v;
            input.value = v;
            highlightIfChanged(number, v, initialVal);
            if (material && material.uniforms && material.uniforms.uModelScale) {
                material.uniforms.uModelScale.value = v;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Model Rotation (XYZ)
    (() => {
        const wrap = document.createElement('div');
        wrap.style.marginTop = '12px';

        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.marginBottom = '4px';

        const title = document.createElement('div');
        title.innerText = 'Model Rotation';
        title.style.fontSize = '12px';
        title.style.fontWeight = 'bold';

        const toggleLabel = document.createElement('label');
        toggleLabel.style.fontSize = '11px';
        toggleLabel.style.display = 'flex';
        toggleLabel.style.alignItems = 'center';
        toggleLabel.innerText = 'Mouse Rot';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.style.marginLeft = '5px';
        toggle.checked = true; // Default

        if (material && material.uniforms && material.uniforms.uEnableMouseRotation) {
            toggle.checked = material.uniforms.uEnableMouseRotation.value;
        }

        toggle.addEventListener('change', (e) => {
            const val = e.target.checked;
            if (material && material.uniforms && material.uniforms.uEnableMouseRotation) {
                material.uniforms.uEnableMouseRotation.value = val;
            }
        });

        toggleLabel.appendChild(toggle);
        titleRow.appendChild(title);
        titleRow.appendChild(toggleLabel);

        wrap.appendChild(titleRow);

        ['x', 'y', 'z'].forEach(axis => {
            const row = document.createElement('div');
            row.style.marginBottom = '4px';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';

            const label = document.createElement('span');
            label.innerText = axis.toUpperCase();
            label.style.fontSize = '11px';

            const rightSide = document.createElement('div');
            rightSide.style.display = 'flex';
            rightSide.style.alignItems = 'center';
            rightSide.style.gap = '6px';

            const valSpan = document.createElement('span');
            valSpan.style.fontSize = '11px';

            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.innerText = 'R';
            resetBtn.title = 'Reset to 0';
            resetBtn.style.fontSize = '10px';
            resetBtn.style.padding = '1px 4px';
            resetBtn.style.cursor = 'pointer';

            rightSide.appendChild(valSpan);
            rightSide.appendChild(resetBtn);

            header.appendChild(label);
            header.appendChild(rightSide);
            row.appendChild(header);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '-6.28';
            slider.max = '6.28';
            slider.step = '0.01';
            slider.value = '0';
            slider.style.width = '100%';
            slider.style.cursor = 'pointer';

            const updateUI = () => {
                if (material && material.uniforms && material.uniforms.uModelRotation) {
                    const v = material.uniforms.uModelRotation.value[axis];
                    slider.value = v;
                    valSpan.innerText = v.toFixed(2);
                    highlightIfChanged(valSpan, v, 0.0);
                }
            };
            uiUpdates.push(updateUI);

            if (material && material.uniforms && material.uniforms.uModelRotation) {
                slider.value = material.uniforms.uModelRotation.value[axis];
            }
            valSpan.innerText = parseFloat(slider.value).toFixed(2);

            slider.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                valSpan.innerText = v.toFixed(2);
                highlightIfChanged(valSpan, v, 0.0);
                if (material && material.uniforms && material.uniforms.uModelRotation) {
                    material.uniforms.uModelRotation.value[axis] = v;
                }
            });

            resetBtn.addEventListener('click', () => {
                const v = 0.0;
                slider.value = v;
                valSpan.innerText = v.toFixed(2);
                highlightIfChanged(valSpan, v, 0.0);
                if (material && material.uniforms && material.uniforms.uModelRotation) {
                    material.uniforms.uModelRotation.value[axis] = v;
                }
            });

            row.appendChild(slider);
            wrap.appendChild(row);
        });

        content.appendChild(wrap);
    })();

    // Model Offset Control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '15px';

        const title = document.createElement('div');
        title.innerText = "Model Offset (Screen)";
        title.style.marginBottom = "5px";
        title.style.fontWeight = "bold";
        title.style.fontSize = '12px';
        wrapper.appendChild(title);

        const createOffsetSlider = (label, axis) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '5px';

            let initialVal = 0.0;
            if (material && material.uniforms && material.uniforms.uModelScreenOffset) {
                initialVal = material.uniforms.uModelScreenOffset.value[axis];
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

            const updateUI = () => {
                if (material && material.uniforms && material.uniforms.uModelScreenOffset) {
                    const v = material.uniforms.uModelScreenOffset.value[axis];
                    text.innerText = `${label}: ${v.toFixed(2)}`;
                    number.value = v;
                    input.value = v;
                }
            };
            uiUpdates.push(updateUI);

            function setValue(val) {
                const v = parseFloat(val) || 0;
                text.innerText = `${label}: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
                highlightIfChanged(number, v, initialVal);
                if (material && material.uniforms && material.uniforms.uModelScreenOffset) {
                    material.uniforms.uModelScreenOffset.value[axis] = v;
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

    // Model Position Control (World Space)
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '10px';

        const title = document.createElement('div');
        title.innerText = 'Model Position (World Space)';
        title.style.fontSize = '12px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '6px';
        wrapper.appendChild(title);

        const createPositionSlider = (label, axis) => {
            const row = document.createElement('div');
            row.style.marginBottom = '5px';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';

            const labelSpan = document.createElement('span');
            labelSpan.innerText = label;
            labelSpan.style.fontSize = '12px';

            const rightSide = document.createElement('div');
            rightSide.style.display = 'flex';
            rightSide.style.alignItems = 'center';
            rightSide.style.gap = '6px';

            let initialVal = 0.0;
            if (material && material.uniforms && material.uniforms.uModelPosition) {
                initialVal = material.uniforms.uModelPosition.value[axis];
            }

            const valSpan = document.createElement('span');
            valSpan.innerText = initialVal.toFixed(2);
            valSpan.style.fontSize = '11px';

            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.innerText = 'R';
            resetBtn.title = 'Reset to 0';
            resetBtn.style.fontSize = '10px';
            resetBtn.style.padding = '1px 4px';
            resetBtn.style.cursor = 'pointer';

            rightSide.appendChild(valSpan);
            rightSide.appendChild(resetBtn);

            header.appendChild(labelSpan);
            header.appendChild(rightSide);
            row.appendChild(header);

            const input = document.createElement('input');
            input.type = 'range';
            input.min = '-50.0'; // Larger range for World Position
            input.max = '50.0';
            input.step = '0.1';
            input.value = initialVal.toString();
            input.style.width = '100%';
            input.style.cursor = 'pointer';

            const updateUI = () => {
                if (material && material.uniforms && material.uniforms.uModelPosition) {
                    const v = material.uniforms.uModelPosition.value[axis];
                    valSpan.innerText = v.toFixed(2);
                    input.value = v;
                }
            };
            uiUpdates.push(updateUI);

            function setValue(val) {
                const v = parseFloat(val) || 0;
                valSpan.innerText = v.toFixed(2);
                if (material && material.uniforms && material.uniforms.uModelPosition) {
                    material.uniforms.uModelPosition.value[axis] = v;
                }
            }

            input.addEventListener('input', (e) => setValue(e.target.value));

            resetBtn.addEventListener('click', () => {
                input.value = "0";
                setValue(0);
            });

            wrapper.appendChild(row);
            wrapper.appendChild(input);
        };

        createPositionSlider("X", "x");
        createPositionSlider("Y", "y");
        createPositionSlider("Z", "z");

        content.appendChild(wrapper);
    })();

    // Model Vibration Factor Control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uModelVibFactor) ? material.uniforms.uModelVibFactor.value : 1.0;

        const text = document.createElement('span');
        text.innerText = `Model Vib Factor: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '10.0';
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
        resetBtn.addEventListener('click', () => setValue(1.0));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '10.0';
        input.step = '0.1';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uModelVibFactor) {
                const v = material.uniforms.uModelVibFactor.value;
                text.innerText = `Model Vib Factor: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Model Vib Factor: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, 1.0);
            if (material && material.uniforms && material.uniforms.uModelVibFactor) {
                material.uniforms.uModelVibFactor.value = val;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Model Point Size Factor Control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uModelPointSizeFactor) ? material.uniforms.uModelPointSizeFactor.value : 1.0;

        const text = document.createElement('span');
        text.innerText = `Model Size Factor: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '5.0';
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
        resetBtn.addEventListener('click', () => setValue(1.0));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '5.0';
        input.step = '0.1';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uModelPointSizeFactor) {
                const v = material.uniforms.uModelPointSizeFactor.value;
                text.innerText = `Model Size Factor: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Model Size Factor: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, 1.0);
            if (material && material.uniforms && material.uniforms.uModelPointSizeFactor) {
                material.uniforms.uModelPointSizeFactor.value = val;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // --- 2. GRID CONTROLS ---
    // Grid Z Position control (uGridZ)
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '15px';
        wrapper.style.marginBottom = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uGridZ) ? material.uniforms.uGridZ.value : -40.0;

        const text = document.createElement('span');
        text.innerText = `Grid Z: ${initial.toFixed(1)}`;
        text.style.fontSize = '12px';
        text.style.fontWeight = 'bold';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '-2000.0';
        number.max = '2000.0';
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
        input.min = '-2000.0';
        input.max = '2000.0';
        input.step = '0.1';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uGridZ) {
                const v = material.uniforms.uGridZ.value;
                text.innerText = `Grid Z: ${v.toFixed(1)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || -40.0;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, initial);
            if (material && material.uniforms && material.uniforms.uGridZ) {
                material.uniforms.uGridZ.value = val;
                text.innerText = `Grid Z: ${val.toFixed(1)}`;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();


    // Hover Point Scale Factor Control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';
        wrapper.style.marginBottom = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uHoverPointScaleFactor) ? material.uniforms.uHoverPointScaleFactor.value : 1.0;

        const text = document.createElement('span');
        text.innerText = `Hover Scale: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '10.0';
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
        resetBtn.addEventListener('click', () => setValue(1.0));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '10.0';
        input.step = '0.1';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uHoverPointScaleFactor) {
                const v = material.uniforms.uHoverPointScaleFactor.value;
                text.innerText = `Hover Scale: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Hover Scale: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, 1.0);
            if (material && material.uniforms && material.uniforms.uHoverPointScaleFactor) {
                material.uniforms.uHoverPointScaleFactor.value = val;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Attraction Force Control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';
        wrapper.style.marginBottom = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uAttractionForce) ? material.uniforms.uAttractionForce.value : 0.0;

        const text = document.createElement('span');
        text.innerText = `Attraction Force: ${initial.toFixed(1)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '4000.0';
        number.step = '0.5';
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
        resetBtn.addEventListener('click', () => setValue(800.0));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '4000.0';
        input.step = '0.5';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uAttractionForce) {
                const v = material.uniforms.uAttractionForce.value;
                text.innerText = `Attraction Force: ${v.toFixed(1)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Attraction Force: ${val.toFixed(1)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, 800.0);
            if (material && material.uniforms && material.uniforms.uAttractionForce) {
                material.uniforms.uAttractionForce.value = val;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Attraction Mass Ref Size (Stability)
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';
        wrapper.style.marginBottom = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uAttractionRefSize) ? material.uniforms.uAttractionRefSize.value : 15.0;

        const text = document.createElement('span');
        text.innerText = `Mass Ref Size: ${initial.toFixed(1)}`;
        text.title = "Lower value = Heavier (More Stable)";
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '1.0';
        number.max = '100.0';
        number.step = '0.5';
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
        resetBtn.addEventListener('click', () => setValue(15.0));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '1.0';
        input.max = '100.0';
        input.step = '0.5';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uAttractionRefSize) {
                const v = material.uniforms.uAttractionRefSize.value;
                text.innerText = `Mass Ref Size: ${v.toFixed(1)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 15.0;
            text.innerText = `Mass Ref Size: ${val.toFixed(1)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, 15.0);
            if (material && material.uniforms && material.uniforms.uAttractionRefSize) {
                material.uniforms.uAttractionRefSize.value = val;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Attraction Radius
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';
        wrapper.style.marginBottom = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uAttractionRadius) ? material.uniforms.uAttractionRadius.value : 600.0;

        const text = document.createElement('span');
        text.innerText = `Attract Radius: ${initial.toFixed(0)}`;
        text.title = "Range of the suction pull";
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '2000.0';
        number.step = '10';
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
        resetBtn.addEventListener('click', () => setValue(600.0));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '2000.0';
        input.step = '10';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uAttractionRadius) {
                const v = material.uniforms.uAttractionRadius.value;
                text.innerText = `Attract Radius: ${v.toFixed(0)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Attract Radius: ${val.toFixed(0)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, 600.0);
            if (material && material.uniforms && material.uniforms.uAttractionRadius) {
                material.uniforms.uAttractionRadius.value = val;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();


    // --- 3. LIGHTING CONTROLS ---
    const lightTitle = document.createElement('div');
    lightTitle.innerText = "Lighting";
    lightTitle.style.marginTop = "15px";
    lightTitle.style.marginBottom = "10px";
    lightTitle.style.fontWeight = "bold";
    content.appendChild(lightTitle);

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

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uLightDir) {
                const val = material.uniforms.uLightDir.value[axis];
                text.innerText = `${label}: ${val.toFixed(1)}`;
                number.value = val;
                input.value = val;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(val) {
            const v = parseFloat(val) || 0;
            text.innerText = `${label}: ${v.toFixed(1)}`;
            number.value = v;
            input.value = v;
            highlightIfChanged(number, v, initialVal);
            if (material && material.uniforms && material.uniforms.uLightDir) {
                material.uniforms.uLightDir.value[axis] = v;
            }
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    };

    createSlider("X", "x");
    createSlider("Y", "y");
    createSlider("Z", "z");

    // Light strength control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

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

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uLightStrength) {
                const v = material.uniforms.uLightStrength.value;
                text.innerText = `Light Strength: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Light Strength: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, initial);
            if (material && material.uniforms && material.uniforms.uLightStrength) material.uniforms.uLightStrength.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // --- 4. BLOOM CONTROLS ---
    const bloomTitle = document.createElement('div');
    bloomTitle.innerText = "Bloom (Post-Process)";
    bloomTitle.style.marginTop = "15px";
    bloomTitle.style.marginBottom = "10px";
    bloomTitle.style.fontWeight = "bold";
    content.appendChild(bloomTitle);

    (() => {
        if (!bloomPass) return;

        const createBloomSlider = (label, property, min, max, step) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '8px';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';

            const initial = bloomPass[property];

            const text = document.createElement('span');
            text.innerText = `${label}: ${initial.toFixed(2)}`;
            text.style.fontSize = '12px';

            const number = document.createElement('input');
            number.type = 'number';
            number.min = min;
            number.max = max;
            number.step = step;
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
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = initial.toString();
            input.style.width = '100%';
            input.style.cursor = 'pointer';

            const updateUI = () => {
                const v = bloomPass[property];
                text.innerText = `${label}: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            };
            uiUpdates.push(updateUI);

            function setValue(v) {
                const val = parseFloat(v) || 0;
                text.innerText = `${label}: ${val.toFixed(2)}`;
                number.value = val;
                input.value = val;
                highlightIfChanged(number, val, initial);
                bloomPass[property] = val;
            }

            input.addEventListener('input', (e) => setValue(e.target.value));
            number.addEventListener('input', (e) => setValue(e.target.value));

            wrapper.appendChild(row);
            wrapper.appendChild(input);
            content.appendChild(wrapper);
        };

        createBloomSlider("Strength", "strength", "0.0", "5.0", "0.01");
        createBloomSlider("Radius", "radius", "0.0", "2.0", "0.01");
        createBloomSlider("Threshold", "threshold", "0.0", "1.0", "0.01");

    })();

    // Light size boost control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

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

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uLightSizeBoost) {
                const v = material.uniforms.uLightSizeBoost.value;
                text.innerText = `Light Size Boost: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Light Size Boost: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, initialBoost);
            if (material && material.uniforms && material.uniforms.uLightSizeBoost) material.uniforms.uLightSizeBoost.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();


    // --- 5. APPEARANCE ---
    const appearTitle = document.createElement('div');
    appearTitle.innerText = "Appearance";
    appearTitle.style.marginTop = "15px";
    appearTitle.style.marginBottom = "10px";
    appearTitle.style.fontWeight = "bold";
    content.appendChild(appearTitle);

    // Point size control
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

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uSize) {
                const v = material.uniforms.uSize.value;
                text.innerText = `Point Size: ${v.toFixed(3)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Point Size: ${val.toFixed(3)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, POINT_SIZE);
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

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uSizeThreshold) {
                const v = material.uniforms.uSizeThreshold.value;
                text.innerText = `Size Threshold: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Size Threshold: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, DEFAULT_SIZE_THRESHOLD);
            if (material && material.uniforms && material.uniforms.uSizeThreshold) material.uniforms.uSizeThreshold.value = val;
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
        input.step = '0.1';
        input.value = defaultPR.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uPixelRatio) {
                const v = material.uniforms.uPixelRatio.value;
                text.innerText = `Pixel Ratio: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Pixel Ratio: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, defaultPR);
            if (material && material.uniforms && material.uniforms.uPixelRatio) material.uniforms.uPixelRatio.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();


    // --- 5. DYNAMICS ---
    const dynamicsTitle = document.createElement('div');
    dynamicsTitle.innerText = "Dynamics";
    dynamicsTitle.style.marginTop = "15px";
    dynamicsTitle.style.marginBottom = "10px";
    dynamicsTitle.style.fontWeight = "bold";
    content.appendChild(dynamicsTitle);

    // Vibration control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initialVib = (material && material.uniforms && material.uniforms.uVibrateAmp) ? material.uniforms.uVibrateAmp.value : 0.0;

        const text = document.createElement('span');
        text.innerText = `Vibration: ${initialVib.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '5.0';
        number.step = '0.01';
        number.value = initialVib.toString();
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
        resetBtn.addEventListener('click', () => setValue(initialVib));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '5.0';
        input.step = '0.01';
        input.value = initialVib.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uVibrateAmp) {
                const v = material.uniforms.uVibrateAmp.value;
                text.innerText = `Vibration: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Vibration: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, initialVib);
            if (material && material.uniforms && material.uniforms.uVibrateAmp) material.uniforms.uVibrateAmp.value = val;
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

        const updateUI = () => {
            if (material && material.uniforms && material.uniforms.uVibrateBoostSizeThreshold) {
                const v = material.uniforms.uVibrateBoostSizeThreshold.value;
                text.innerText = `Vibrate Boost Size: ${v.toFixed(2)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Vibrate Boost Size: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, initial);
            if (material && material.uniforms && material.uniforms.uVibrateBoostSizeThreshold) material.uniforms.uVibrateBoostSizeThreshold.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Mouse Damping control
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (mouseDamping) ? mouseDamping.value : 0.001;

        const text = document.createElement('span');
        text.innerText = `Mouse Damping: ${initial.toFixed(3)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.001';
        number.max = '0.2';
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
        input.max = '0.2';
        input.step = '0.001';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        const updateUI = () => {
            if (mouseDamping) {
                const v = mouseDamping.value;
                text.innerText = `Mouse Damping: ${v.toFixed(3)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0.001;
            text.innerText = `Mouse Damping: ${val.toFixed(3)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, initial);
            if (mouseDamping) mouseDamping.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        content.appendChild(wrapper);
    })();

    // Point return speed control (new)
    (() => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (pointReturnSpeed) ? pointReturnSpeed.value : 0.05;

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

        const updateUI = () => {
            if (pointReturnSpeed) {
                const v = pointReturnSpeed.value;
                text.innerText = `Point Return Speed: ${v.toFixed(3)}`;
                number.value = v;
                input.value = v;
            }
        };
        uiUpdates.push(updateUI);

        function setValue(v) {
            const val = parseFloat(v) || 0.001;
            text.innerText = `Point Return Speed: ${val.toFixed(3)}`;
            number.value = val;
            input.value = val;
            highlightIfChanged(number, val, initial);
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
            .easing(BACK_OUT_DEFAULT)
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
