import * as THREE from 'three';

export class Helper {
    constructor(scene, camera, renderer, orbitControl = null) {
        this.camera = camera;
        this.orbitControl = orbitControl;
        this.renderer = renderer;
        this.scene = scene;
        const originalUpdate = this.orbitControl.update.bind(this.orbitControl);

        // --- Helpers (Axes, Grid, Box, Orbit Target) ---
        this.axes = new THREE.AxesHelper(2);
        this.grid = new THREE.GridHelper(2, 10);
        this.box = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)), 0xff0000);
        scene.add(this.axes);
        scene.add(this.grid);
        scene.add(this.box);

        // Orbit Target Visual
        this.orbitAxesPart = new THREE.AxesHelper(0.5);
        const createTargetSphere = () => {
            const geometry = new THREE.SphereGeometry(0.05, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0xffa500, wireframe: true });
            const sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);
            return sphere;
        };
        this.orbitAxes = createTargetSphere();
        this.orbitAxes.add(this.orbitAxesPart);
        scene.add(this.orbitAxes);
        this.orbitAxes.visible = false;

        // Override OrbitControls update to also update orbitAxes position
        this.orbitControl.update = () => {
            originalUpdate();
            this.orbitAxes.position.copy(this.orbitControl.target);
        };

        // Show/hide helpers utility
        [this.axes, this.grid, this.box, this.orbitAxes].forEach(obj => {
            obj.show = () => { obj.visible = true; };
            obj.hide = () => { obj.visible = false; };
        });

        // --- UI: Status Box ---
        this.Status = document.createElement('div');
        Object.assign(this.Status.style, {
            position: 'fixed',
            left: '10px',
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
            minWidth: '200px',
            userSelect: 'none'
        });

        // --- Head Section ---
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
        title.textContent = 'HELPERS';

        const chevron = document.createElement('span');
        chevron.innerHTML = '&#x25BC;';
        chevron.style.transition = 'transform 0.2s';

        head.appendChild(title);
        head.appendChild(chevron);

        // --- Body Section ---
        const body = document.createElement('div');
        Object.assign(body.style, {
            padding: '8px 10px 10px 10px',
            fontSize: '11px',
            transition: 'max-height 0.2s',
            overflow: 'hidden'
        });

        // --- Title Style for Sections ---
        const sectionTitleStyle = {
            fontWeight: 'bold',
            color: '#1976d2', // blue
            fontSize: '13px'
        };

        // --- Helpers Section (Part 1) ---
        const helpersSection = document.createElement('div');
        helpersSection.style.marginBottom = '10px';

        const helpersTitle = document.createElement('div');
        helpersTitle.textContent = 'Helpers:';
        Object.assign(helpersTitle.style, sectionTitleStyle);
        helpersTitle.style.marginBottom = '4px';
        helpersSection.appendChild(helpersTitle);

        // Helper controls with slider
        const helpers = [
            {
                name: 'Axes',
                isResizable: true,
                getValue: () => {
                    let geo = this.axes.geometry;
                    geo.computeBoundingBox();
                    return geo.boundingBox.max.x - geo.boundingBox.min.x;
                },
                setValue: (val) => {
                    scene.remove(this.axes);
                    this.axes = new THREE.AxesHelper(val);
                    this.axes.visible = axesCheckbox.checked;
                    this.axes.show = () => { this.axes.visible = true; };
                    this.axes.hide = () => { this.axes.visible = false; };
                    scene.add(this.axes);
                },
                getVisible: () => this.axes.visible,
                setVisible: (v) => { this.axes.visible = v; }
            },
            {
                name: 'Grid',
                isResizable: true,
                getValue: () => {
                    let geo = this.grid.geometry;
                    geo.computeBoundingBox();
                    return geo.boundingBox.max.x - geo.boundingBox.min.x;
                },
                setValue: (val) => {
                    scene.remove(this.grid);
                    this.grid = new THREE.GridHelper(val, val / 0.1);
                    this.grid.visible = gridCheckbox.checked;
                    this.grid.show = () => { this.grid.visible = true; };
                    this.grid.hide = () => { this.grid.visible = false; };
                    scene.add(this.grid);
                },
                getVisible: () => this.grid.visible,
                setVisible: (v) => { this.grid.visible = v; }
            },
            {
                name: 'Box',
                isResizable: true,
                getValue: () => {
                    let geo = this.box.geometry;
                    geo.computeBoundingBox();
                    return geo.boundingBox.max.x - geo.boundingBox.min.x;
                },
                setValue: (val) => {
                    scene.remove(this.box);
                    const mesh = new THREE.Mesh(new THREE.BoxGeometry(val, val, val));
                    this.box = new THREE.BoxHelper(mesh, 0xff0000);
                    this.box.visible = boxCheckbox.checked;
                    this.box.show = () => { this.box.visible = true; };
                    this.box.hide = () => { this.box.visible = false; };
                    scene.add(this.box);
                    this._boxSize = val;
                },
                getVisible: () => this.box.visible,
                setVisible: (v) => { this.box.visible = v; }
            },
            {
                name: 'Orbit Target',
                isResizable: false,
                getVisible: () => this.orbitAxes.visible,
                setVisible: (v) => { this.orbitAxes.visible = v; }
            },
        ];

        let axesCheckbox, gridCheckbox, boxCheckbox;

        helpers.forEach(helper => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.marginBottom = '4px';

            const label = document.createElement('span');
            label.textContent = helper.name;
            label.style.width = '100px';
            label.style.display = 'inline-block';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = helper.getVisible();
            checkbox.style.marginRight = '6px';
            checkbox.onchange = () => helper.setVisible(checkbox.checked);

            if (helper.name === 'Axes') axesCheckbox = checkbox;
            if (helper.name === 'Grid') gridCheckbox = checkbox;
            if (helper.name === 'Box') boxCheckbox = checkbox;

            row.appendChild(label);
            row.appendChild(checkbox);
            row.appendChild(document.createTextNode('Show'));

            if (helper.isResizable) {
                const slider = document.createElement('input');
                slider.type = 'range';
                const currentValue = helper.getValue();
                slider.min = 1;
                slider.max = Math.max(10, Math.round(currentValue * 10));
                slider.value = currentValue;
                slider.style.marginLeft = '6px';
                slider.style.width = '80px';

                const valueLabel = document.createElement('span');
                valueLabel.textContent = slider.value;
                valueLabel.style.marginLeft = '6px';
                valueLabel.style.width = '28px';
                valueLabel.style.display = 'inline-block';

                slider.oninput = () => {
                    const val = parseFloat(slider.value);
                    helper.setValue(val);
                    valueLabel.textContent = val;
                };

                row.appendChild(slider);
                row.appendChild(valueLabel);
            }

            helpersSection.appendChild(row);
        });

        // --- Track Checkbox Section ---
        const trackContainer = document.createElement('label');
        Object.assign(trackContainer.style, {
            display: 'flex',
            alignItems: 'center',
            margin: '8px 0 12px 0',
            fontWeight: 'normal',
            fontSize: '11px'
        });

        const trackCheckbox = document.createElement('input');
        trackCheckbox.type = 'checkbox';
        trackCheckbox.checked = true;
        trackCheckbox.style.marginRight = '4px';

        const trackLabel = document.createElement('span');
        trackLabel.textContent = 'Track live statistics';

        trackContainer.appendChild(trackCheckbox);
        trackContainer.appendChild(trackLabel);

        this.liveTracking = true;
        trackCheckbox.onchange = () => {
            this.liveTracking = trackCheckbox.checked;
        };

        // --- Camera & Orbit Controls Section (Part 2) ---
        const statusSection = document.createElement('div');
        statusSection.style.marginTop = '10px';
        statusSection.style.borderTop = '1px solid #eee';
        statusSection.style.paddingTop = '6px';

        const statusTitle = document.createElement('div');
        statusTitle.textContent = 'Camera and Orbit Controls:';
        Object.assign(statusTitle.style, sectionTitleStyle);
        statusTitle.style.marginBottom = '4px';
        statusSection.appendChild(statusTitle);
        statusSection.appendChild(trackContainer);

        // --- Helper function for editable row with Copy/Apply ---
        function createEditRowWithCopy(labelText, getValue, setValue) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.marginBottom = '4px';

            const label = document.createElement('span');
            label.textContent = labelText;
            label.style.flex = '0 0 120px';

            // Support 4D for quaternion
            const axes = labelText.includes('Quaternion') ? ['x', 'y', 'z', 'w'] : ['x', 'y', 'z'];

            // Inputs container
            const inputsContainer = document.createElement('div');
            inputsContainer.style.display = 'flex';
            inputsContainer.style.padding = '6px';
            axes.forEach(axis => {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = labelText.includes('Quaternion') ? '0.01' : '0.1';
                input.style.width = '50px';
                input.style.fontFamily = 'monospace';
                input.style.fontSize = '11px';
                input.value = getValue()[axis];
                inputsContainer.appendChild(input);
            });
            const inputs = Array.from(inputsContainer.children);

            // Buttons container
            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '4px';
            btnGroup.style.marginLeft = 'auto';

            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copy';
            Object.assign(copyBtn.style, {
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'color 0.2s',
                fontSize: '10px',
                padding: '2px 8px',
                border: '1px solid #bbb',
                borderRadius: '3px',
                background: '#e3f2fd', // light blue
                color: '#1976d2',
                minWidth: '54px'
            });

            let copyTimeout = null;
            copyBtn.onclick = () => {
                const v = getValue();
                const val = axes.map(axis => v[axis]).join(', ');
                navigator.clipboard.writeText(`(${val})`);
                copyBtn.textContent = 'COPIED ✔';
                copyBtn.style.color = '#4caf50';
                copyBtn.style.background = '#e8f5e9';
                copyBtn.style.borderColor = '#81c784';
                if (copyTimeout) clearTimeout(copyTimeout);
                copyTimeout = setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                    copyBtn.style.color = '#1976d2';
                    copyBtn.style.background = '#e3f2fd';
                    copyBtn.style.borderColor = '#bbb';
                }, 500);
            };

            const applyBtn = document.createElement('button');
            applyBtn.textContent = 'Apply';
            Object.assign(applyBtn.style, {
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'color 0.2s',
                fontSize: '10px',
                padding: '2px 8px',
                border: '1px solid #bbb',
                borderRadius: '3px',
                background: '#e3f2fd', // light blue
                color: '#1976d2',
                minWidth: '54px'
            });

            applyBtn.onclick = () => {
                const values = {};
                axes.forEach((axis, i) => {
                    values[axis] = parseFloat(inputs[i].value);
                });
                setValue(values);
            };

            const updateApplyVisibility = () => {
                applyBtn.style.display = trackCheckbox.checked ? 'none' : '';
            };
            updateApplyVisibility();
            trackCheckbox.addEventListener('change', updateApplyVisibility);

            btnGroup.appendChild(copyBtn);
            btnGroup.appendChild(applyBtn);

            // Layout: label | inputs | (flex) | buttons
            row.appendChild(label);
            row.appendChild(inputsContainer);
            row.appendChild(btnGroup);

            // Live update on input change if tracking
            inputs.forEach(input => {
                input.onchange = () => {
                    if (trackCheckbox.checked) {
                        const values = {};
                        axes.forEach((axis, i) => {
                            values[axis] = parseFloat(inputs[i].value);
                        });
                        setValue(values);
                    }
                };
            });

            return { row, inputs };
        }

        // Camera/Orbit rows
        const posRow = createEditRowWithCopy('Camera Position:',
            () => this.camera.position,
            v => {
                this.camera.position.set(v.x, v.y, v.z);
                if (this.orbitControl) this.orbitControl.update();
            }
        );
        const rotRow = createEditRowWithCopy('Camera Rotation:',
            () => this.camera.rotation,
            v => {
                this.camera.rotation.set(v.x, v.y, v.z);
                if (this.orbitControl) this.orbitControl.update();
            }
        );
        const quatRow = createEditRowWithCopy('Camera Quaternion:',
            () => this.camera.quaternion,
            v => {
                this.camera.quaternion.set(v.x, v.y, v.z, v.w);
                if (this.orbitControl) this.orbitControl.update();
            }
        );
        const targetRow = createEditRowWithCopy('Orbit Target:',
            () => (this.orbitControl && this.orbitControl.target) ? this.orbitControl.target : { x: 0, y: 0, z: 0 },
            v => {
                if (this.orbitControl && this.orbitControl.target) {
                    this.orbitControl.target.set(v.x, v.y, v.z);
                    this.orbitControl.update();
                }
            }
        );

        statusSection.appendChild(posRow.row);
        statusSection.appendChild(rotRow.row);
        statusSection.appendChild(quatRow.row);
        statusSection.appendChild(targetRow.row);

        this._statusBody = statusSection;
        this._statusPosInputs = posRow.inputs;
        this._statusRotInputs = rotRow.inputs;
        this._statusQuatInputs = quatRow.inputs;
        this._statusTargetInputs = targetRow.inputs;

        // --- Renderer Info Section (Part 3) ---
        const rendererSection = document.createElement('div');
        rendererSection.style.marginTop = '10px';
        rendererSection.style.borderTop = '1px solid #eee';
        rendererSection.style.paddingTop = '6px';

        const rendererTitle = document.createElement('div');
        rendererTitle.textContent = 'Renderer Info:';
        Object.assign(rendererTitle.style, sectionTitleStyle);
        rendererTitle.style.marginBottom = '4px';
        rendererSection.appendChild(rendererTitle);

        const rendererInfo = document.createElement('pre');
        rendererInfo.style.fontFamily = 'monospace';
        rendererInfo.style.fontSize = '11px';
        rendererInfo.style.margin = '0';
        rendererSection.appendChild(rendererInfo);

        // --- Dropdowns for renderer properties ---
        // 1. Output Color Space
        const outputColorSpaceRow = document.createElement('div');
        outputColorSpaceRow.style.display = 'flex';
        outputColorSpaceRow.style.alignItems = 'center';
        outputColorSpaceRow.style.marginBottom = '4px';

        const outputColorSpaceLabel = document.createElement('span');
        outputColorSpaceLabel.textContent = 'Output Color Space:';
        outputColorSpaceLabel.style.flex = '0 0 140px';

        const outputColorSpaceSelect = document.createElement('select');
        [
            
            { name: 'Linear', value: THREE.LinearSRGBColorSpace },
            { name: 'SRGB', value: THREE.SRGBColorSpace }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.name;
            if (renderer.outputColorSpace === opt.value) option.selected = true;
            outputColorSpaceSelect.appendChild(option);
        });
        outputColorSpaceSelect.onchange = () => {
            renderer.outputColorSpace = outputColorSpaceSelect.value;
        };

        outputColorSpaceRow.appendChild(outputColorSpaceLabel);
        outputColorSpaceRow.appendChild(outputColorSpaceSelect);
        rendererSection.appendChild(outputColorSpaceRow);

        // 2. Tone Mapping
        const toneMappingRow = document.createElement('div');
        toneMappingRow.style.display = 'flex';
        toneMappingRow.style.alignItems = 'center';
        toneMappingRow.style.marginBottom = '4px';

        const toneMappingLabel = document.createElement('span');
        toneMappingLabel.textContent = 'Tone Mapping:';
        toneMappingLabel.style.flex = '0 0 140px';

        const toneMappingSelect = document.createElement('select');
        [
            { name: 'None', value: THREE.NoToneMapping },
            { name: 'Linear', value: THREE.LinearToneMapping },
            { name: 'Reinhard', value: THREE.ReinhardToneMapping },
            { name: 'Cineon', value: THREE.CineonToneMapping },
            { name: 'ACESFilmic', value: THREE.ACESFilmicToneMapping },
            { name: 'AgX', value: THREE.AgXToneMapping },
            { name: 'Neutral', value: THREE.NeutralToneMapping },
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.name;
            if (renderer.toneMapping === opt.value) option.selected = true;
            toneMappingSelect.appendChild(option);
        });
        toneMappingSelect.onchange = () => {
            renderer.toneMapping = parseInt(toneMappingSelect.value);
        };

        toneMappingRow.appendChild(toneMappingLabel);
        toneMappingRow.appendChild(toneMappingSelect);
        rendererSection.appendChild(toneMappingRow);

        // 3. Tone Mapping Exposure
        const exposureRow = document.createElement('div');
        exposureRow.style.display = 'flex';
        exposureRow.style.alignItems = 'center';
        exposureRow.style.marginBottom = '4px';

        const exposureLabel = document.createElement('span');
        exposureLabel.textContent = 'ToneMapping Exposure:';
        exposureLabel.style.flex = '0 0 140px';

        const exposureInput = document.createElement('input');
        exposureInput.type = 'range';
        exposureInput.min = 0;
        exposureInput.max = 5;
        exposureInput.step = 0.1;
        exposureInput.value = renderer.toneMappingExposure ?? 1;

        const exposureValue = document.createElement('span');
        exposureValue.textContent = exposureInput.value;
        exposureValue.style.marginLeft = '8px';
        exposureValue.style.width = '32px';

        exposureInput.oninput = () => {
            renderer.toneMappingExposure = parseFloat(exposureInput.value);
            exposureValue.textContent = exposureInput.value;
        };

        exposureRow.appendChild(exposureLabel);
        exposureRow.appendChild(exposureInput);
        exposureRow.appendChild(exposureValue);
        rendererSection.appendChild(exposureRow);

        // 4. Shadow Map Types
        const shadowTypeRow = document.createElement('div');
        shadowTypeRow.style.display = 'flex';
        shadowTypeRow.style.alignItems = 'center';
        shadowTypeRow.style.marginBottom = '4px';

        const shadowTypeLabel = document.createElement('span');
        shadowTypeLabel.textContent = 'Shadow Type:';
        shadowTypeLabel.style.flex = '0 0 140px';

        const shadowTypeSelect = document.createElement('select');
        [
            { name: 'Basic', value: THREE.BasicShadowMap },
            { name: 'PCF', value: THREE.PCFShadowMap },
            { name: 'PCF Soft', value: THREE.PCFSoftShadowMap },
            { name: 'VSM', value: THREE.VSMShadowMap }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.name;
            if (renderer.shadowMap.type === opt.value) option.selected = true;
            shadowTypeSelect.appendChild(option);
        });
        shadowTypeSelect.onchange = () => {
            renderer.shadowMap.type = parseInt(shadowTypeSelect.value);
        };

        shadowTypeRow.appendChild(shadowTypeLabel);
        shadowTypeRow.appendChild(shadowTypeSelect);
        rendererSection.appendChild(shadowTypeRow);

        // --- Reset to Defaults Button ---
        const initialValues = {
            helpers: {
                axes: this.axes.geometry.boundingBox.max.x - this.axes.geometry.boundingBox.min.x,
                grid: this.grid.geometry.boundingBox.max.x - this.grid.geometry.boundingBox.min.x,
                box: this.box.geometry.boundingBox.max.x - this.box.geometry.boundingBox.min.x,
                axesVisible: this.axes.visible,
                gridVisible: this.grid.visible,
                boxVisible: this.box.visible,
                orbitTargetVisible: this.orbitAxes.visible
            },
            camera: {
                position: this.camera.position.clone(),
                rotation: this.camera.rotation.clone(),
                quaternion: this.camera.quaternion.clone()
            },
            orbitTarget: this.orbitControl && this.orbitControl.target
                ? this.orbitControl.target.clone()
                : { x: 0, y: 0, z: 0 },
            renderer: {
                outputColorSpace: renderer.outputColorSpace,
                toneMapping: renderer.toneMapping,
                toneMappingExposure: renderer.toneMappingExposure ?? 1,
                shadowMapType: renderer.shadowMap.type
            }
        };
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset to Defaults';
        Object.assign(resetBtn.style, {
            marginTop: '8px',
            marginBottom: '8px',
            padding: '4px 12px',
            fontWeight: 'bold',
            color: '#1976d2',
            background: '#e3f2fd',
            border: '1px solid #1976d2',
            borderRadius: '4px',
            cursor: 'pointer'
        });

        resetBtn.onclick = () => {
            // Helpers
            this.axes.visible = initialValues.helpers.axesVisible;
            this.grid.visible = initialValues.helpers.gridVisible;
            this.box.visible = initialValues.helpers.boxVisible;
            this.orbitAxes.visible = initialValues.helpers.orbitTargetVisible;

            this.axes.geometry.dispose();
            scene.remove(this.axes);
            this.axes = new THREE.AxesHelper(initialValues.helpers.axes);
            this.axes.visible = initialValues.helpers.axesVisible;
            scene.add(this.axes);

            this.grid.geometry.dispose();
            scene.remove(this.grid);
            this.grid = new THREE.GridHelper(initialValues.helpers.grid, initialValues.helpers.grid / 0.1);
            this.grid.visible = initialValues.helpers.gridVisible;
            scene.add(this.grid);

            this.box.geometry.dispose();
            scene.remove(this.box);
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(initialValues.helpers.box, initialValues.helpers.box, initialValues.helpers.box));
            this.box = new THREE.BoxHelper(mesh, 0xff0000);
            this.box.visible = initialValues.helpers.boxVisible;
            scene.add(this.box);

            // Camera
            this.camera.position.copy(initialValues.camera.position);
            this.camera.rotation.copy(initialValues.camera.rotation);
            this.camera.quaternion.copy(initialValues.camera.quaternion);

            // Orbit Target
            if (this.orbitControl && this.orbitControl.target) {
                this.orbitControl.target.copy(initialValues.orbitTarget);
                this.orbitControl.update();
            }

            // Renderer
            renderer.outputColorSpace = initialValues.renderer.outputColorSpace;
            renderer.toneMapping = initialValues.renderer.toneMapping;
            renderer.toneMappingExposure = initialValues.renderer.toneMappingExposure;
            renderer.shadowMap.type = initialValues.renderer.shadowMapType;

            // Update UI controls to match
            outputColorSpaceSelect.value = initialValues.renderer.outputColorSpace;
            toneMappingSelect.value = initialValues.renderer.toneMapping;
            exposureInput.value = initialValues.renderer.toneMappingExposure;
            exposureValue.textContent = initialValues.renderer.toneMappingExposure;
            shadowTypeSelect.value = initialValues.renderer.shadowMapType;

            axesCheckbox.checked = initialValues.helpers.axesVisible;
            gridCheckbox.checked = initialValues.helpers.gridVisible;
            boxCheckbox.checked = initialValues.helpers.boxVisible;

            if (this._statusPosInputs) {
                this._statusPosInputs[0].value = initialValues.camera.position.x;
                this._statusPosInputs[1].value = initialValues.camera.position.y;
                this._statusPosInputs[2].value = initialValues.camera.position.z;
            }
            if (this._statusRotInputs) {
                this._statusRotInputs[0].value = initialValues.camera.rotation.x;
                this._statusRotInputs[1].value = initialValues.camera.rotation.y;
                this._statusRotInputs[2].value = initialValues.camera.rotation.z;
            }
            if (this._statusQuatInputs) {
                this._statusQuatInputs[0].value = initialValues.camera.quaternion.x;
                this._statusQuatInputs[1].value = initialValues.camera.quaternion.y;
                this._statusQuatInputs[2].value = initialValues.camera.quaternion.z;
                this._statusQuatInputs[3].value = initialValues.camera.quaternion.w;
            }
            if (this._statusTargetInputs) {
                this._statusTargetInputs[0].value = initialValues.orbitTarget.x;
                this._statusTargetInputs[1].value = initialValues.orbitTarget.y;
                this._statusTargetInputs[2].value = initialValues.orbitTarget.z;
            }

            this.update();
        };

        // Add the button to the very top of your main body/status box:
        body.appendChild(resetBtn);

        // Add all sections to body
        body.appendChild(helpersSection);
        body.appendChild(statusSection);
        body.appendChild(rendererSection);

        // Compose status box
        this.Status.appendChild(head);
        this.Status.appendChild(body);
        document.body.appendChild(this.Status);

        // --- Make helper bar draggable by dragging the head only, and prevent expand/collapse on drag ---
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let dragMoved = false;

        function startDrag(e) {
            isDragging = true;
            dragMoved = false;
            const rect = this.Status.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            this.Status.style.position = 'absolute';
            this.Status.style.left = rect.left + 'px';
            this.Status.style.top = rect.top + 'px';
            this.Status.style.right = '';
            this.Status.style.bottom = '';
            document.body.style.userSelect = 'none';
        }

        function onDrag(e) {
            if (!isDragging) return;
            this.Status.style.left = (e.clientX - dragOffsetX) + 'px';
            this.Status.style.top = (e.clientY - dragOffsetY) + 'px';
            dragMoved = true;
        }

        function stopDrag() {
            if (isDragging) {
                setTimeout(() => { dragMoved = false; }, 0); // reset after click event
                isDragging = false;
                document.body.style.userSelect = '';
            }
        }

        head.style.cursor = 'move';
        this.Status.style.left = 'unset';
        this.Status.style.top = 'unset';

        // Bind the drag functions to the class instance
        const boundStartDrag = startDrag.bind(this);
        const boundOnDrag = onDrag.bind(this);
        const boundStopDrag = stopDrag.bind(this);

        head.addEventListener('mousedown', boundStartDrag);
        document.addEventListener('mousemove', boundOnDrag);
        document.addEventListener('mouseup', boundStopDrag);

        // Collapse/expand logic, but ignore if it was a drag
        let collapsed = false;
        head.addEventListener('click', (e) => {
            if (dragMoved) return;
            collapsed = !collapsed;
            body.style.display = collapsed ? 'none' : 'block';
            chevron.innerHTML = collapsed ? '&#x25B2;' : '&#x25BC;';
        });

        // --- Renderer Info Update ---
        this.updateRendererInfo = () => {
            const info = renderer.info;
            rendererInfo.textContent =
                `memory:
  geometries: ${info.memory.geometries}
  textures: ${info.memory.textures}
render:
  calls:     ${info.render.calls}
  triangles: ${info.render.triangles}
  points:    ${info.render.points}
  lines:     ${info.render.lines}
  frame:     ${info.render.frame}`;
        };

        this.update();
    }

    update() {
        if (!this.camera || !this._statusBody) return;
        const pos = this.camera.position;
        const rot = this.camera.rotation;
        const quat = this.camera.quaternion;

        // Update position of orbit axes
        this.orbitAxes.position.copy(this.orbitControl.target);

        // Update input values to reflect current state
        if (this._statusPosInputs) {
            this._statusPosInputs[0].value = pos.x.toFixed(2);
            this._statusPosInputs[1].value = pos.y.toFixed(2);
            this._statusPosInputs[2].value = pos.z.toFixed(2);
        }
        if (this._statusRotInputs) {
            this._statusRotInputs[0].value = rot.x.toFixed(2);
            this._statusRotInputs[1].value = rot.y.toFixed(2);
            this._statusRotInputs[2].value = rot.z.toFixed(2);
        }
        if (this._statusQuatInputs) {
            this._statusQuatInputs[0].value = quat.x.toFixed(4);
            this._statusQuatInputs[1].value = quat.y.toFixed(4);
            this._statusQuatInputs[2].value = quat.z.toFixed(4);
            this._statusQuatInputs[3].value = quat.w.toFixed(4);
        }
        if (this.orbitControl && this.orbitControl.target && this._statusTargetInputs) {
            const t = this.orbitControl.target;
            this._statusTargetInputs[0].value = t.x.toFixed(2);
            this._statusTargetInputs[1].value = t.y.toFixed(2);
            this._statusTargetInputs[2].value = t.z.toFixed(2);
        } else if (this._statusTargetInputs) {
            this._statusTargetInputs[0].value = 0;
            this._statusTargetInputs[1].value = 0;
            this._statusTargetInputs[2].value = 0;
        }

        if (typeof this.updateRendererInfo === 'function') {
            this.updateRendererInfo();
        }
    }
}