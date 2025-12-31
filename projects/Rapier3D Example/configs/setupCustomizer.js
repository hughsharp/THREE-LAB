import * as THREE from 'three';

export class Customizer {
    constructor(scene) {
        this.scene = scene;

        // Create a single AxesHelper instance for reuse
        this.AxesHelper = new THREE.AxesHelper(20000);
        this.AxesHelper.visible = false;
        this.scene.add(this.AxesHelper);

        // --- Panel style (match Helper) ---
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            position: 'fixed',
            right: '10px',
            bottom: '10px',
            background: 'white',
            color: 'black',
            padding: '0',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '11px',
            zIndex: '1000',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'block',
            minWidth: '260px',
            userSelect: 'none'
        });

        // --- Header style (match Helper) ---
        const head = document.createElement('div');
        Object.assign(head.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            background: '#eee',
            padding: '6px 10px',
            borderTopLeftRadius: '5px',
            borderTopRightRadius: '5px',
            cursor: 'pointer',
            letterSpacing: '1px'
        });

        const title = document.createElement('span');
        title.textContent = 'CUSTOMIZER';

        const chevron = document.createElement('span');
        chevron.innerHTML = '&#x25BC;'
        chevron.style.transition = 'transform 0.2s';

        head.appendChild(title);
        head.appendChild(chevron);

        // --- Body style (match Helper) ---
        const body = document.createElement('div');
        Object.assign(body.style, {
            padding: '8px 10px 10px 10px',
            fontSize: '11px',
            transition: 'max-height 0.2s',
            overflow: 'hidden'
        });

        // --- Section Title style (match Helper) ---
        const sectionTitleStyle = {
            fontWeight: 'bold',
            color: '#1976d2',
            fontSize: '13px',
            marginBottom: '4px'
        };

        // --- Get object by name section ---
        const getSection = document.createElement('div');
        getSection.style.marginBottom = '12px';

        const getTitle = document.createElement('div');
        getTitle.textContent = 'Get object by name';
        Object.assign(getTitle.style, sectionTitleStyle);

        const inputRow = document.createElement('div');
        inputRow.style.display = 'flex';
        inputRow.style.alignItems = 'center';
        inputRow.style.marginBottom = '8px';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Enter a name';
        Object.assign(this.input.style, {
            flex: '1',
            padding: '6px 8px',
            fontSize: '12px',
            border: '1px solid #bbb',
            borderRadius: '4px',
            fontFamily: 'monospace',
            marginRight: '8px'
        });

        this.btn = document.createElement('button');
        this.btn.textContent = 'Get & Log';
        Object.assign(this.btn.style, {
            padding: '6px 14px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'background 0.2s'
        });

        inputRow.appendChild(this.input);
        inputRow.appendChild(this.btn);

        getSection.appendChild(getTitle);
        getSection.appendChild(inputRow);

        // --- Object info section ---
        const infoSection = document.createElement('div');
        infoSection.style.marginTop = '8px';

        const infoTitle = document.createElement('div');
        infoTitle.textContent = 'Object info';
        Object.assign(infoTitle.style, sectionTitleStyle);

        this.infoContent = document.createElement('div');
        this.infoContent.style.fontSize = '12px';
        this.infoContent.style.marginTop = '6px';
        const infoContent = this.infoContent

        // --- Show/Hide Object Checkbox ---
        const showObjRow = document.createElement('div');
        showObjRow.style.display = 'flex';
        showObjRow.style.alignItems = 'center';
        showObjRow.style.gap = '8px';
        showObjRow.style.marginTop = '8px';

        const showObjCheckbox = document.createElement('input');
        showObjCheckbox.type = 'checkbox';
        showObjCheckbox.id = 'show-object-visibility';

        const showObjLabel = document.createElement('label');
        showObjLabel.textContent = 'Show object';
        showObjLabel.htmlFor = 'show-object-visibility';

        showObjRow.appendChild(showObjCheckbox);
        showObjRow.appendChild(showObjLabel);

        // --- Axes Helper Checkbox ---
        const axesRow = document.createElement('div');
        axesRow.style.display = 'flex';
        axesRow.style.alignItems = 'center';
        axesRow.style.gap = '8px';
        axesRow.style.marginTop = '8px';

        const axesCheckbox = document.createElement('input');
        axesCheckbox.type = 'checkbox';
        axesCheckbox.id = 'axes-visibility';

        const axesLabel = document.createElement('label');
        axesLabel.textContent = 'Show axes helper';
        axesLabel.htmlFor = 'axes-visibility';

        axesRow.appendChild(axesCheckbox);
        axesRow.appendChild(axesLabel);

        infoSection.appendChild(infoTitle);
        infoSection.appendChild(this.infoContent);
        infoSection.appendChild(showObjRow);
        infoSection.appendChild(axesRow);

        // --- Customize object section ---
        const customizeSection = document.createElement('div');
        customizeSection.style.marginTop = '12px';
        customizeSection.style.display = 'none';

        const customizeTitle = document.createElement('div');
        customizeTitle.textContent = 'Customize object';
        Object.assign(customizeTitle.style, sectionTitleStyle);

        const customizeBody = document.createElement('div');
        customizeBody.style.display = 'flex';
        customizeBody.style.flexDirection = 'column';
        customizeBody.style.gap = '8px';

        customizeSection.appendChild(customizeTitle);
        customizeSection.appendChild(customizeBody);

        // --- Customize material section ---
        const matSection = document.createElement('div');
        matSection.style.marginTop = '12px';
        matSection.style.display = 'none';

        const matTitle = document.createElement('div');
        matTitle.textContent = 'Customize material';
        Object.assign(matTitle.style, sectionTitleStyle);

        const matInfo = document.createElement('div');
        matInfo.style.fontSize = '12px';
        matInfo.style.marginBottom = '8px';

        const matControls = document.createElement('div');
        matControls.style.display = 'flex';
        matControls.style.flexDirection = 'column';
        matControls.style.gap = '8px';

        matSection.appendChild(matTitle);
        matSection.appendChild(matInfo);
        matSection.appendChild(matControls);

        // --- Customize light section ---
        const lightSection = document.createElement('div');
        lightSection.style.marginTop = '12px';
        lightSection.style.display = 'none';

        const lightTitle = document.createElement('div');
        lightTitle.textContent = 'Customize light';
        Object.assign(lightTitle.style, sectionTitleStyle);

        const lightInfo = document.createElement('div');
        lightInfo.style.fontSize = '12px';
        lightInfo.style.marginBottom = '8px';

        const lightControls = document.createElement('div');
        lightControls.style.display = 'flex';
        lightControls.style.flexDirection = 'column';
        lightControls.style.gap = '8px';

        lightSection.appendChild(lightTitle);
        lightSection.appendChild(lightInfo);
        lightSection.appendChild(lightControls);

        // --- Add sections to body ---
        body.appendChild(getSection);
        body.appendChild(infoSection);
        body.appendChild(customizeSection);
        body.appendChild(matSection);
        body.appendChild(lightSection);

        // --- Helper to create editable row for position/rotation/scale ---
        function createEditRow(label, vector, onChange) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            labelSpan.style.fontWeight = '500';
            labelSpan.style.width = '70px';

            const inputBox = document.createElement('div');
            inputBox.style.display = 'flex';
            inputBox.style.gap = '8px';

            const axes = ['x', 'y', 'z'];
            const inputs = axes.map(axis => {
                const input = document.createElement('input');
                input.type = 'number';
                input.value = vector[axis].toFixed(2);
                input.style.width = '50px';
                input.style.fontFamily = 'monospace';
                input.style.fontSize = '12px';
                input.style.padding = '2px 4px';
                input.style.border = '1px solid #bbb';
                input.style.borderRadius = '3px';
                input.onchange = () => {
                    let val = parseFloat(input.value);
                    if (isNaN(val)) val = 0;
                    vector[axis] = val;
                    if (onChange) onChange();
                };
                return input;
            });

            inputs.forEach(input => inputBox.appendChild(input));
            row.appendChild(labelSpan);
            row.appendChild(inputBox);

            // For updating values later
            row._inputs = inputs;
            return row;
        }

        // --- Helper to create vector3 controls for envMapRotation ---
        function createVector3Control(label, vector, onChange, options) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            labelSpan.style.width = '110px';

            const axes = ['x', 'y', 'z'];
            const inputs = axes.map(axis => {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = options?.step ?? 0.01;
                input.min = options?.min ?? 0;
                input.max = options?.max ?? (Math.PI * 2);
                input.value = vector[axis]?.toFixed(2) ?? 0;
                input.style.width = '45px';
                input.style.fontFamily = 'monospace';
                input.style.fontSize = '12px';
                input.style.padding = '2px 4px';
                input.style.border = '1px solid #bbb';
                input.style.borderRadius = '3px';
                input.oninput = () => {
                    let val = parseFloat(input.value);
                    if (isNaN(val)) val = 0;
                    vector[axis] = val;
                    if (onChange) onChange(vector);
                };
                return input;
            });

            row.appendChild(labelSpan);
            inputs.forEach(input => row.appendChild(input));
            return row;
        }

        // --- Helper to create material property controls ---
        function createMaterialControl(label, type, value, onChange, options) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            labelSpan.style.width = '110px';

            let input;
            if (type === 'color') {
                input = document.createElement('input');
                input.type = 'color';
                // Convert THREE.Color to hex string if needed
                input.value = (typeof value === 'string') ? value : '#' + value.getHexString();
                input.oninput = () => {
                    onChange(input.value);
                };
            } else if (type === 'number' || type === 'range') {
                input = document.createElement('input');
                input.type = 'range';
                input.min = options?.min ?? 0;
                input.max = options?.max ?? 1;
                input.step = options?.step ?? 0.01;
                input.value = value;
                const numberInput = document.createElement('input');
                numberInput.type = 'number';
                numberInput.min = input.min;
                numberInput.max = input.max;
                numberInput.step = input.step;
                numberInput.value = value;
                input.oninput = () => {
                    numberInput.value = input.value;
                    onChange(parseFloat(input.value));
                };
                numberInput.oninput = () => {
                    input.value = numberInput.value;
                    onChange(parseFloat(numberInput.value));
                };
                row.appendChild(labelSpan);
                row.appendChild(input);
                row.appendChild(numberInput);
                return row;
            } else if (type === 'select') {
                input = document.createElement('select');
                for (const opt of options) {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    input.appendChild(option);
                }
                input.value = value;
                input.onchange = () => {
                    onChange(input.value);
                };
            }
            row.appendChild(labelSpan);
            row.appendChild(input);
            return row;
        }

        // --- Button click logic ---
        this.btn.onclick = () => {
            const name = this.input.value.trim();
            if (!name) {
                this.infoContent.textContent = 'Please enter a name.';
                this.infoContent.style.color = '#d32f2f';
                customizeSection.style.display = 'none';
                axesCheckbox.checked = false;
                axesCheckbox.disabled = true;
                matSection.style.display = 'none';
                // Hide AxesHelper if no object found
                this.AxesHelper.visible = false;
                if (this.AxesHelper.parent && this.AxesHelper.parent !== this.scene) {
                    this.AxesHelper.parent.remove(this.AxesHelper);
                    this.scene.add(this.AxesHelper);
                }
                return;
            }
            const obj = this.scene.getObjectByName(name);
            if (!obj) {
                this.infoContent.textContent = 'No object with given name.';
                this.infoContent.style.color = '#d32f2f';
                customizeSection.style.display = 'none';
                axesCheckbox.checked = false;
                axesCheckbox.disabled = true;
                matSection.style.display = 'none';
                // Hide AxesHelper if no object found
                this.AxesHelper.visible = false;
                if (this.AxesHelper.parent && this.AxesHelper.parent !== this.scene) {
                    this.AxesHelper.parent.remove(this.AxesHelper);
                    this.scene.add(this.AxesHelper);
                }
                return;
            }
            // Show position, rotation, and scale
            const pos = obj.position;
            const rot = obj.rotation;
            const scale = obj.scale;
            // Compute world position
            const worldPos = new THREE.Vector3();
            obj.getWorldPosition(worldPos);
            infoContent.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="font-size:11px;color:#888;">World position: x: ${worldPos.x.toFixed(2)}, y: ${worldPos.y.toFixed(2)}, z: ${worldPos.z.toFixed(2)}</div>
                    <div style="display: flex; align-items: center;">
                        <span style="font-weight:500; width: 70px;">Position:</span>
                        <span style="display: flex; gap: 18px; margin-left:12px;">
                            <span style="width: 50px;">x: ${pos.x.toFixed(2)}</span>
                            <span style="width: 50px;">y: ${pos.y.toFixed(2)}</span>
                            <span style="width: 50px;">z: ${pos.z.toFixed(2)}</span>
                        </span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="font-weight:500; width: 70px;">Rotation:</span>
                        <span style="display: flex; gap: 18px; margin-left:12px;">
                            <span style="width: 50px;">x: ${rot.x.toFixed(2)}</span>
                            <span style="width: 50px;">y: ${rot.y.toFixed(2)}</span>
                            <span style="width: 50px;">z: ${rot.z.toFixed(2)}</span>
                        </span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="font-weight:500; width: 70px;">Scale:</span>
                        <span style="display: flex; gap: 18px; margin-left:12px;">
                            <span style="width: 50px;">x: ${scale.x.toFixed(2)}</span>
                            <span style="width: 50px;">y: ${scale.y.toFixed(2)}</span>
                            <span style="width: 50px;">z: ${scale.z.toFixed(2)}</span>
                        </span>
                    </div>
                </div>
            `;
            this.infoContent.style.color = 'black';
            console.log(obj);

            // --- Axes Helper logic ---
            axesCheckbox.checked = false;
            axesCheckbox.disabled = false;

            // Remove AxesHelper from any previous parent
            if (this.AxesHelper.parent && this.AxesHelper.parent !== this.scene) {
                this.AxesHelper.parent.remove(this.AxesHelper);
                this.scene.add(this.AxesHelper);
                this.AxesHelper.visible = false;
            }

            axesCheckbox.onchange = () => {
                if (axesCheckbox.checked) {
                    // Remove from previous parent if needed
                    if (this.AxesHelper.parent && this.AxesHelper.parent !== obj) {
                        this.AxesHelper.parent.remove(this.AxesHelper);
                    }
                    obj.add(this.AxesHelper);
                    this.AxesHelper.visible = true;
                } else {
                    if (this.AxesHelper.parent && this.AxesHelper.parent !== this.scene) {
                        this.AxesHelper.parent.remove(this.AxesHelper);
                        this.scene.add(this.AxesHelper);
                    }
                    this.AxesHelper.visible = false;
                }
            };

            // --- Show/Hide Object logic ---
            showObjCheckbox.disabled = false;
            showObjCheckbox.checked = obj.visible;
            showObjCheckbox.onchange = () => {
                obj.visible = showObjCheckbox.checked;
            };

            // --- Show and update customize section ---
            customizeSection.style.display = 'block';
            customizeBody.innerHTML = '';

            // Create rows for position, rotation, scale
            const posRow = createEditRow('Position:', pos, updateInfo);
            const rotRow = createEditRow('Rotation:', rot, updateInfo);
            const scaleRow = createEditRow('Scale:', scale, updateInfo);

            customizeBody.appendChild(posRow);
            customizeBody.appendChild(rotRow);
            customizeBody.appendChild(scaleRow);

            // Add copy button to each row
            function addCopyButton(row, vector) {
                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Copy';
                copyBtn.style.marginLeft = '8px';
                copyBtn.style.fontSize = '12px';
                copyBtn.onclick = () => {
                    const text = `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
                    navigator.clipboard.writeText(text);
                };
                row.appendChild(copyBtn);
            }

            addCopyButton(posRow, pos);
            addCopyButton(rotRow, rot);
            addCopyButton(scaleRow, scale);

            // Update info section when customized
            function updateInfo() {
                infoContent.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-weight:500; width: 70px;">Position:</span>
                            <span style="display: flex; gap: 18px; margin-left:12px;">
                                <span style="width: 50px;">x: ${pos.x.toFixed(2)}</span>
                                <span style="width: 50px;">y: ${pos.y.toFixed(2)}</span>
                                <span style="width: 50px;">z: ${pos.z.toFixed(2)}</span>
                            </span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="font-weight:500; width: 70px;">Rotation:</span>
                            <span style="display: flex; gap: 18px; margin-left:12px;">
                                <span style="width: 50px;">x: ${rot.x.toFixed(2)}</span>
                                <span style="width: 50px;">y: ${rot.y.toFixed(2)}</span>
                                <span style="width: 50px;">z: ${rot.z.toFixed(2)}</span>
                            </span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="font-weight:500; width: 70px;">Scale:</span>
                            <span style="display: flex; gap: 18px; margin-left:12px;">
                                <span style="width: 50px;">x: ${scale.x.toFixed(2)}</span>
                                <span style="width: 50px;">y: ${scale.y.toFixed(2)}</span>
                                <span style="width: 50px;">z: ${scale.z.toFixed(2)}</span>
                            </span>
                        </div>
                    </div>
                `;
                infoContent.style.color = 'black';
            }
            updateInfo = updateInfo.bind(this);

            // --- Customize material section logic ---
            matSection.style.display = 'none';
            matInfo.innerHTML = '';
            matControls.innerHTML = '';

            // Try to get the material
            let mat = obj.material;
            if (Array.isArray(mat)) mat = mat[0];
            if (mat && mat.isMaterial) {
                matSection.style.display = 'block';
                // Part 1: Show info
                matInfo.innerHTML = `
                    <div><b>Name:</b> ${mat.name || '(unnamed)'}</div>
                    <div><b>Type:</b> ${mat.type}</div>
                `;

                // Part 2: Controls
                // Color
                if (mat.color) {
                    matControls.appendChild(
                        createMaterialControl('Color', 'color', mat.color, val => {
                            mat.color.set(val);
                            mat.needsUpdate = true;
                        })
                    );
                }
                // envMapIntensity
                if ('envMapIntensity' in mat) {
                    matControls.appendChild(
                        createMaterialControl('EnvMap Intensity', 'range', mat.envMapIntensity, val => {
                            mat.envMapIntensity = val;
                            mat.needsUpdate = true;
                        }, { min: 0, max: 5, step: 0.01 })
                    );
                }
                // envMapRotation (Vector3 or scalar)
                if ('envMapRotation' in mat && mat.envMapRotation && typeof mat.envMapRotation === 'object' && 'x' in mat.envMapRotation) {
                    matControls.appendChild(
                        createVector3Control(
                            'EnvMap Rotation',
                            mat.envMapRotation,
                            v => {
                                mat.envMapRotation.x = v.x;
                                mat.envMapRotation.y = v.y;
                                mat.envMapRotation.z = v.z;
                                mat.needsUpdate = true;
                            },
                            { min: 0, max: Math.PI * 2, step: 0.01 }
                        )
                    );
                } else if ('envMapRotation' in mat) {
                    matControls.appendChild(
                        createMaterialControl('EnvMap Rotation', 'range', mat.envMapRotation, val => {
                            mat.envMapRotation = val;
                            mat.needsUpdate = true;
                        }, { min: 0, max: Math.PI * 2, step: 0.01 })
                    );
                }
                // metalness
                if ('metalness' in mat) {
                    matControls.appendChild(
                        createMaterialControl('Metalness', 'range', mat.metalness, val => {
                            mat.metalness = val;
                            mat.needsUpdate = true;
                        }, { min: 0, max: 1, step: 0.01 })
                    );
                }
                // roughness
                if ('roughness' in mat) {
                    matControls.appendChild(
                        createMaterialControl('Roughness', 'range', mat.roughness, val => {
                            mat.roughness = val;
                            mat.needsUpdate = true;
                        }, { min: 0, max: 1, step: 0.01 })
                    );
                }
                // side
                matControls.appendChild(
                    createMaterialControl(
                        'Side',
                        'select',
                        mat.side,
                        val => {
                            mat.side = parseInt(val);
                            mat.needsUpdate = true;
                        },
                        [
                            { value: THREE.FrontSide, label: 'FrontSide' },
                            { value: THREE.BackSide, label: 'BackSide' },
                            { value: THREE.DoubleSide, label: 'DoubleSide' }
                        ]
                    )
                );
                // blending
                matControls.appendChild(
                    createMaterialControl(
                        'Blending',
                        'select',
                        mat.blending,
                        val => {
                            mat.blending = parseInt(val);
                            mat.needsUpdate = true;
                        },
                        [
                            { value: THREE.NoBlending, label: 'NoBlending' },
                            { value: THREE.NormalBlending, label: 'NormalBlending' },
                            { value: THREE.AdditiveBlending, label: 'AdditiveBlending' },
                            { value: THREE.SubtractiveBlending, label: 'SubtractiveBlending' },
                            { value: THREE.MultiplyBlending, label: 'MultiplyBlending' },
                            { value: THREE.CustomBlending, label: 'CustomBlending' }
                        ]
                    )
                );
            }

            // --- Customize light section logic ---
            lightSection.style.display = 'none';
            lightInfo.innerHTML = '';
            lightControls.innerHTML = '';

            if (obj.isLight) {
                lightSection.style.display = 'block';
                // Show info
                lightInfo.innerHTML = `
                    <div><b>Name:</b> ${obj.name || '(unnamed)'}</div>
                    <div><b>Type:</b> ${obj.type}</div>
                `;

                // Color
                if (obj.color) {
                    lightControls.appendChild(
                        createMaterialControl('Color', 'color', obj.color, val => {
                            obj.color.set(val);
                        })
                    );
                }
                // Decay
                if ('decay' in obj) {
                    lightControls.appendChild(
                        createMaterialControl('Decay', 'range', obj.decay, val => {
                            obj.decay = val;
                        }, { min: 0, max: 5, step: 0.01 })
                    );
                }
                // Distance
                if ('distance' in obj) {
                    lightControls.appendChild(
                        createMaterialControl('Distance', 'range', obj.distance, val => {
                            obj.distance = val;
                        }, { min: 0, max: 100, step: 0.1 })
                    );
                }
                // Intensity
                if ('intensity' in obj) {
                    lightControls.appendChild(
                        createMaterialControl('Intensity', 'range', obj.intensity, val => {
                            obj.intensity = val;
                        }, { min: 0, max: 10000, step: 1 })
                    );
                }
            }
        };

        // --- Add to document ---
        panel.appendChild(head);
        panel.appendChild(body);
        document.body.appendChild(panel);

        // Expose for external control if needed
        this.panel = panel;
        this.body = body;
        this.head = head;

        // --- Make panel draggable by dragging the head only, and prevent expand/collapse on drag ---
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let dragMoved = false;

        head.style.cursor = 'move';
        panel.style.left = 'unset';
        panel.style.top = 'unset';

        head.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragMoved = false;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            panel.style.position = 'absolute';
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            panel.style.right = '';
            panel.style.bottom = '';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = (e.clientX - dragOffsetX) + 'px';
            panel.style.top = (e.clientY - dragOffsetY) + 'px';
            dragMoved = true;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                setTimeout(() => { dragMoved = false; }, 0); // reset after click event
                isDragging = false;
                document.body.style.userSelect = '';
            }
        });

        // Collapse/expand logic, but ignore if it was a drag
        let collapsed = false;
        head.addEventListener('click', (e) => {
            if (dragMoved) return;
            collapsed = !collapsed;
            body.style.display = collapsed ? 'none' : 'block';
            chevron.innerHTML = collapsed ? '&#x25B2;' : '&#x25BC;';
        });
    }
}