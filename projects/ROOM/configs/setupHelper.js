import * as THREE from 'three';

export class Helper {
    constructor(scene, camera, renderer, orbitControl = null) {
        // --- Core Properties ---
        this.camera = camera;
        this.orbitControl = orbitControl;
        this.renderer = renderer;
        this.scene = scene;

        // --- Build UI ---
        this._createPanel();
        this._createHelpersSection();
        this._createCameraSection();
        this._createSceneSection();
        this._createRendererSection();
        this._createResetButton();
        this._composePanel();
        this._setupInteractivity();

        // --- Final Setup ---
        this.update();
    }

    //
    // --- Private UI Creation Methods ---
    //

    _createPanel() {
        this.Status = document.createElement('div');
        Object.assign(this.Status.style, {
            position: 'fixed', left: '10px', bottom: '10px', background: 'white', color: 'black',
            padding: '0', borderRadius: '5px', fontFamily: 'monospace', fontSize: '11px', zIndex: '1000',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'block', minWidth: '200px', userSelect: 'none'
        });

        this.head = document.createElement('div');
        Object.assign(this.head.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold',
            textTransform: 'uppercase', background: '#eee', padding: '6px 10px', borderRadius: '5px 5px 0 0',
            cursor: 'pointer', letterSpacing: '1px'
        });

        const title = document.createElement('span');
        title.textContent = 'HELPERS';
        this.chevron = document.createElement('span');
        this.chevron.innerHTML = '&#x25BC;';
        this.chevron.style.transition = 'transform 0.2s';
        this.head.appendChild(title);
        this.head.appendChild(this.chevron);

        this.body = document.createElement('div');
        Object.assign(this.body.style, {
            padding: '8px 10px 10px 10px', fontSize: '11px',
            transition: 'max-height 0.2s', overflow: 'hidden'
        });

        this.sectionTitleStyle = { fontWeight: 'bold', color: '#1976d2', fontSize: '13px' };
    }

    _createHelpersSection() {
        const originalUpdate = this.orbitControl.update.bind(this.orbitControl);
        this.axes = new THREE.AxesHelper(2); this.grid = new THREE.GridHelper(2, 10); this.box = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)), 0xff0000);
        this.scene.add(this.axes); this.scene.add(this.grid); this.scene.add(this.box);
        this.box.visible = false; this.grid.visible = false;
        const orbitAxesPart = new THREE.AxesHelper(0.5);
        const sphereGeom = new THREE.SphereGeometry(0.05, 32, 32);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffa500, wireframe: true });
        this.orbitAxes = new THREE.Mesh(sphereGeom, sphereMat);
        this.orbitAxes.add(orbitAxesPart);
        this.scene.add(this.orbitAxes); this.orbitAxes.visible = false;
        this.orbitControl.update = () => { originalUpdate(); this.orbitAxes.position.copy(this.orbitControl.target); };
        [this.axes, this.grid, this.box, this.orbitAxes].forEach(obj => { obj.show = () => { obj.visible = true; }; obj.hide = () => { obj.visible = false; }; });

        this.helpersSection = document.createElement('div');
        this.helpersSection.style.marginBottom = '10px';
        const title = document.createElement('div');
        title.textContent = 'Helpers:'; Object.assign(title.style, this.sectionTitleStyle); title.style.marginBottom = '4px';
        this.helpersSection.appendChild(title);

        const helpers = [
            { name: 'Axes', obj: this.axes, resizable: true, creator: (v) => new THREE.AxesHelper(v) },
            { name: 'Grid', obj: this.grid, resizable: true, creator: (v) => new THREE.GridHelper(v, v / 0.1) },
            { name: 'Box', obj: this.box, resizable: true, creator: (v) => new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(v, v, v)), 0xff0000) },
            { name: 'Orbit Target', obj: this.orbitAxes, resizable: false }
        ];

        helpers.forEach(h => {
            const row = this._createUI_Row(h.name, h.obj, h.resizable, h.creator);
            this.helpersSection.appendChild(row);
        });
    }

    _createCameraSection() {
        this.cameraSection = document.createElement('div');
        this.cameraSection.style.marginTop = '10px'; this.cameraSection.style.borderTop = '1px solid #eee'; this.cameraSection.style.paddingTop = '6px';
        const title = document.createElement('div');
        title.textContent = 'Camera and Orbit Controls:'; Object.assign(title.style, this.sectionTitleStyle); title.style.marginBottom = '4px';
        this.cameraSection.appendChild(title);

        const trackContainer = document.createElement('label');
        Object.assign(trackContainer.style, { display: 'flex', alignItems: 'center', margin: '8px 0 12px 0', fontWeight: 'normal' });
        const trackCheckbox = document.createElement('input');
        trackCheckbox.type = 'checkbox'; trackCheckbox.checked = true; trackCheckbox.style.marginRight = '4px';
        trackContainer.appendChild(trackCheckbox);
        trackContainer.appendChild(document.createTextNode('Track live statistics'));
        this.cameraSection.appendChild(trackContainer);
        this.liveTracking = true;
        trackCheckbox.onchange = () => { this.liveTracking = trackCheckbox.checked; };

        const posRow = this._createUI_EditRow('Camera Position:', () => this.camera.position, v => this.camera.position.set(v.x, v.y, v.z));
        const rotRow = this._createUI_EditRow('Camera Rotation:', () => this.camera.rotation, v => this.camera.rotation.set(v.x, v.y, v.z));
        const quatRow = this._createUI_EditRow('Camera Quaternion:', () => this.camera.quaternion, v => this.camera.quaternion.set(v.x, v.y, v.z, v.w));
        const targetRow = this._createUI_EditRow('Orbit Target:', () => this.orbitControl.target, v => this.orbitControl.target.set(v.x, v.y, v.z));

        this.cameraSection.appendChild(posRow.row); this.cameraSection.appendChild(rotRow.row); this.cameraSection.appendChild(quatRow.row); this.cameraSection.appendChild(targetRow.row);
        this._statusPosInputs = posRow.inputs; this._statusRotInputs = rotRow.inputs; this._statusQuatInputs = quatRow.inputs; this._statusTargetInputs = targetRow.inputs;
    }

    _createSceneSection() {
        this.sceneSection = document.createElement('div');
        this.sceneSection.style.marginTop = '10px'; this.sceneSection.style.borderTop = '1px solid #eee'; this.sceneSection.style.paddingTop = '6px';
        const title = document.createElement('div');
        title.textContent = 'Scene Info:'; Object.assign(title.style, this.sectionTitleStyle); title.style.marginBottom = '4px';
        this.sceneSection.appendChild(title);

        this.bgColorInput = this._createUI_ColorPicker('Background Color:', () => this.scene.background, val => { if (!this.scene.background) { this.scene.background = new THREE.Color(); } this.scene.background.set(val); });
        this.envIntensityControls = this._createUI_Slider('Env Intensity:', () => this.scene.environmentIntensity, val => this.scene.environmentIntensity = val, { min: 0, max: 5, step: 0.1 });
        this.sceneSection.appendChild(this.bgColorInput.row);
        this.sceneSection.appendChild(this.envIntensityControls.row);
    }

    _createRendererSection() {
        this.rendererSection = document.createElement('div');
        this.rendererSection.style.marginTop = '10px'; this.rendererSection.style.borderTop = '1px solid #eee'; this.rendererSection.style.paddingTop = '6px';
        const title = document.createElement('div');
        title.textContent = 'Renderer Info:'; Object.assign(title.style, this.sectionTitleStyle); title.style.marginBottom = '4px';
        this.rendererSection.appendChild(title);

        const infoGrid = document.createElement('div');
        infoGrid.style.display = 'grid'; infoGrid.style.gridTemplateColumns = '1fr 1fr'; infoGrid.style.gap = '2px 12px'; infoGrid.style.marginBottom = '8px';
        this._rendererStats = {};
        ['Geometries', 'Textures', 'Calls', 'Triangles', 'Points', 'Lines', 'Frame'].forEach(label => {
            const labelSpan = document.createElement('span'); labelSpan.textContent = `${label}:`;
            const valueSpan = document.createElement('span'); valueSpan.textContent = '0'; valueSpan.style.textAlign = 'right';
            infoGrid.appendChild(labelSpan); infoGrid.appendChild(valueSpan);
            this._rendererStats[label.toLowerCase()] = valueSpan;
        });
        this.rendererSection.appendChild(infoGrid);

        const colorSpaceOptions = [{ name: 'Linear', value: THREE.LinearSRGBColorSpace }, { name: 'SRGB', value: THREE.SRGBColorSpace }];
        const toneMappingOptions = [{ name: 'None', value: THREE.NoToneMapping }, { name: 'Linear', value: THREE.LinearToneMapping }, { name: 'Reinhard', value: THREE.ReinhardToneMapping }, { name: 'Cineon', value: THREE.CineonToneMapping }, { name: 'ACESFilmic', value: THREE.ACESFilmicToneMapping }, { name: 'AgX', value: THREE.AgXToneMapping }, { name: 'Neutral', value: THREE.NeutralToneMapping }];
        const shadowOptions = [{ name: 'Basic', value: THREE.BasicShadowMap }, { name: 'PCF', value: THREE.PCFShadowMap }, { name: 'PCF Soft', value: THREE.PCFSoftShadowMap }, { name: 'VSM', value: THREE.VSMShadowMap }];

        this.outputColorSpaceSelect = this._createUI_Select('Output Color Space:', () => this.renderer.outputColorSpace, v => this.renderer.outputColorSpace = v, colorSpaceOptions);
        this.toneMappingSelect = this._createUI_Select('Tone Mapping:', () => this.renderer.toneMapping, v => this.renderer.toneMapping = parseInt(v), toneMappingOptions);
        this.exposureControls = this._createUI_Slider('ToneMapping Exposure:', () => this.renderer.toneMappingExposure, v => this.renderer.toneMappingExposure = v, { min: 0, max: 5, step: 0.1 });
        this.shadowTypeSelect = this._createUI_Select('Shadow Type:', () => this.renderer.shadowMap.type, v => this.renderer.shadowMap.type = parseInt(v), shadowOptions);

        this.rendererSection.appendChild(this.outputColorSpaceSelect.row);
        this.rendererSection.appendChild(this.toneMappingSelect.row);
        this.rendererSection.appendChild(this.exposureControls.row);
        this.rendererSection.appendChild(this.shadowTypeSelect.row);
    }
    
    _createResetButton() {
        this.resetBtn = document.createElement('button');
        this.resetBtn.textContent = 'Reset to Defaults';
        Object.assign(this.resetBtn.style, {
            marginTop: '8px', padding: '4px 12px', fontWeight: 'bold', color: '#1976d2',
            background: '#e3f2fd', border: '1px solid #1976d2', borderRadius: '4px', cursor: 'pointer'
        });
        // Note: Reset logic is complex and best handled inside _setupInteractivity
    }

    _composePanel() {
        this.body.appendChild(this.resetBtn);
        this.body.appendChild(this.helpersSection);
        this.body.appendChild(this.cameraSection);
        this.body.appendChild(this.sceneSection);
        this.body.appendChild(this.rendererSection);
        this.Status.appendChild(this.head);
        this.Status.appendChild(this.body);
        document.body.appendChild(this.Status);
    }

    //
    // --- UI Element Creators (Helpers for the helpers) ---
    //

    _createUI_Row(name, obj, isResizable, creator) {
        const row = document.createElement('div');
        row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.marginBottom = '4px';
        const label = document.createElement('span');
        label.textContent = name; label.style.width = '100px';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.checked = obj.visible; checkbox.style.marginRight = '6px';
        checkbox.onchange = () => obj.visible = checkbox.checked;
        obj.checkbox = checkbox;
        row.appendChild(label); row.appendChild(checkbox); row.appendChild(document.createTextNode('Show'));

        if (isResizable) {
            const getVal = () => { let geo = obj.geometry; geo.computeBoundingBox(); return geo.boundingBox.max.x - geo.boundingBox.min.x; };
            const slider = document.createElement('input');
            slider.type = 'range'; slider.min = 1; slider.max = Math.max(10, Math.round(getVal() * 10)); slider.value = getVal();
            slider.style.marginLeft = '6px'; slider.style.width = '80px';
            const valueLabel = document.createElement('span');
            valueLabel.textContent = slider.value; valueLabel.style.marginLeft = '6px'; valueLabel.style.width = '28px';
            slider.oninput = () => {
                const newObj = creator(parseFloat(slider.value));
                this.scene.remove(obj);
                if(obj.geometry) obj.geometry.dispose();
                if(obj.material) obj.material.dispose();
                obj = newObj;
                obj.visible = checkbox.checked;
                this.scene.add(obj);
                valueLabel.textContent = slider.value;
            };
            row.appendChild(slider); row.appendChild(valueLabel);
        }
        return row;
    }

    _createUI_EditRow(labelText, getValue, setValue) {
        const row = document.createElement('div'); row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.marginBottom = '4px';
        const label = document.createElement('span'); label.textContent = labelText; label.style.flex = '0 0 120px';
        const axes = labelText.includes('Quaternion') ? ['x', 'y', 'z', 'w'] : ['x', 'y', 'z'];
        const inputsContainer = document.createElement('div'); inputsContainer.style.display = 'flex'; inputsContainer.style.padding = '6px';
        const inputs = axes.map(axis => {
            const input = document.createElement('input'); input.type = 'number'; input.step = 0.1; input.style.width = '50px';
            input.value = getValue()[axis]; inputsContainer.appendChild(input); return input;
        });
        const btnGroup = document.createElement('div'); btnGroup.style.display = 'flex'; btnGroup.style.gap = '4px'; btnGroup.style.marginLeft = 'auto';
        const copyBtn = document.createElement('button'); copyBtn.textContent = 'Copy'; Object.assign(copyBtn.style, { cursor: 'pointer', fontSize: '10px', padding: '2px 8px', border: '1px solid #bbb', borderRadius: '3px', background: '#e3f2fd', color: '#1976d2' });
        copyBtn.onclick = () => { navigator.clipboard.writeText(`(${axes.map(a => getValue()[a]).join(', ')})`); copyBtn.textContent = 'COPIED ✔'; setTimeout(() => { copyBtn.textContent = 'Copy'; }, 500); };
        btnGroup.appendChild(copyBtn);
        row.appendChild(label); row.appendChild(inputsContainer); row.appendChild(btnGroup);
        return { row, inputs };
    }

    _createUI_Slider(labelText, getValue, setValue, { min, max, step }) {
        const row = document.createElement('div'); row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.marginBottom = '4px';
        const label = document.createElement('span'); label.textContent = labelText; label.style.flex = '0 0 140px';
        const slider = document.createElement('input'); slider.type = 'range'; slider.min = min; slider.max = max; slider.step = step; slider.value = getValue() ?? 1;
        const valueDisplay = document.createElement('span'); valueDisplay.textContent = slider.value; valueDisplay.style.marginLeft = '8px'; valueDisplay.style.width = '32px';
        slider.oninput = () => { const val = parseFloat(slider.value); setValue(val); valueDisplay.textContent = val.toFixed(1); };
        row.appendChild(label); row.appendChild(slider); row.appendChild(valueDisplay);
        return { row, slider, valueDisplay };
    }

    _createUI_Select(labelText, getValue, setValue, options) {
        const row = document.createElement('div'); row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.marginBottom = '4px';
        const label = document.createElement('span'); label.textContent = labelText; label.style.flex = '0 0 140px';
        const select = document.createElement('select');
        options.forEach(opt => {
            const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.name;
            if (getValue() === opt.value) option.selected = true;
            select.appendChild(option);
        });
        select.onchange = () => setValue(select.value);
        row.appendChild(label); row.appendChild(select);
        return { row, select };
    }

    _createUI_ColorPicker(labelText, getValue, setValue) {
        const row = document.createElement('div'); row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.marginBottom = '4px';
        const label = document.createElement('span'); label.textContent = labelText; label.style.flex = '0 0 140px';
        const colorInput = document.createElement('input'); colorInput.type = 'color';
        colorInput.value = '#' + (getValue() ? getValue().getHexString() : '000000');
        colorInput.style.width = '100px';
        colorInput.oninput = () => setValue(colorInput.value);
        row.appendChild(label); row.appendChild(colorInput);
        return { row, colorInput };
    }

    //
    // --- Interactivity ---
    //

    _setupInteractivity() {
        // Dragging
        let isDragging = false, dragMoved = false, dragOffsetX = 0, dragOffsetY = 0;
        this.head.onmousedown = (e) => {
            isDragging = true; dragMoved = false; const rect = this.Status.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left; dragOffsetY = e.clientY - rect.top;
            this.Status.style.position = 'absolute'; this.Status.style.left = rect.left + 'px'; this.Status.style.top = rect.top + 'px';
            this.Status.style.right = ''; this.Status.style.bottom = ''; document.body.style.userSelect = 'none';
        };
        document.onmousemove = (e) => {
            if (!isDragging) return;
            this.Status.style.left = (e.clientX - dragOffsetX) + 'px'; this.Status.style.top = (e.clientY - dragOffsetY) + 'px';
            dragMoved = true;
        };
        document.onmouseup = () => { if (isDragging) { setTimeout(() => { dragMoved = false; }, 0); isDragging = false; document.body.style.userSelect = ''; } };

        // Collapsing
        let collapsed = true;
        this.body.style.display = 'none';
        this.chevron.innerHTML = '&#x25B2;';
        this.head.onclick = (e) => {
            if (dragMoved) return;
            collapsed = !collapsed;
            this.body.style.display = collapsed ? 'none' : 'block';
            this.chevron.innerHTML = collapsed ? '&#x25B2;' : '&#x25BC;';
            if (!collapsed) {
                this.update();
                this.Status.style.position = 'fixed'; this.Status.style.left = '10px'; this.Status.style.bottom = '10px';
                this.Status.style.top = ''; this.Status.style.right = '';
            }
        };
    }

    //
    // --- Public Methods ---
    //

    update() {
        if (!this.camera) return;

        // Update Camera/Orbit inputs
        const pos = this.camera.position; const rot = this.camera.rotation; const quat = this.camera.quaternion; const t = this.orbitControl.target;
        this._statusPosInputs.forEach((inp, i) => inp.value = pos.getComponent(i).toFixed(2));
        this._statusRotInputs.forEach((inp, i) => inp.value = rot.toArray()[i].toFixed(2));
        this._statusQuatInputs.forEach((inp, i) => inp.value = quat.toArray()[i].toFixed(4));
        this._statusTargetInputs.forEach((inp, i) => inp.value = t.getComponent(i).toFixed(2));
        this.orbitAxes.position.copy(this.orbitControl.target);

        // Refresh UI controls
        if (this.scene.background) this.bgColorInput.colorInput.value = '#' + this.scene.background.getHexString();
        const intensity = this.scene.environmentIntensity ?? 1;
        this.envIntensityControls.slider.value = intensity; this.envIntensityControls.valueDisplay.textContent = Number(intensity).toFixed(1);
        this.outputColorSpaceSelect.select.value = this.renderer.outputColorSpace;
        this.toneMappingSelect.select.value = this.renderer.toneMapping;
        const exposure = this.renderer.toneMappingExposure ?? 1;
        this.exposureControls.slider.value = exposure; this.exposureControls.valueDisplay.textContent = Number(exposure).toFixed(1);
        this.shadowTypeSelect.select.value = this.renderer.shadowMap.type;

        // Update Renderer Stats
        const info = this.renderer.info;
        this._rendererStats.geometries.textContent = info.memory.geometries;
        this._rendererStats.textures.textContent = info.memory.textures;
        this._rendererStats.calls.textContent = info.render.calls;
        this._rendererStats.triangles.textContent = info.render.triangles;
        this._rendererStats.points.textContent = info.render.points;
        this._rendererStats.lines.textContent = info.render.lines;
        this._rendererStats.frame.textContent = info.render.frame;
    }
}