import * as THREE from 'three';

export class Customizer {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera; // Store camera for "Look at Camera"
        this.selectedObject = null;
        this.searchBy = 'name';
        this.currentOriginalMaterial = null;

        this.AxesHelper = new THREE.AxesHelper(20000);
        this.AxesHelper.visible = false;
        this.scene.add(this.AxesHelper);

        this._createPanel();

        // Sections
        this._createGetSection('#ffffff');
        this._createObjectInfoSection('#f7f7f7');
        this._createCustomizeSections();
        this._createDescendantMaterialsSection();
        this._createCopyMaterialSection();

        this._composePanel();
        this._setupEventListeners();
    }

    //
    // --- State Helpers (Snapshots) ---
    //

    _getObjectState(obj) {
        return {
            position: obj.position.clone(),
            rotation: obj.rotation.clone(),
            scale: obj.scale.clone(),
            isRapierBound: !!obj.isRapierBound // Capture physics state
        };
    }

    _getMaterialState(mat) {
        const state = {};
        if (mat.color) state.color = mat.color.getHex();
        if (mat.emissive) state.emissive = mat.emissive.getHex();

        // Scalars
        ['metalness', 'roughness', 'emissiveIntensity', 'envMapIntensity', 'opacity'].forEach(key => {
            if (key in mat) state[key] = mat[key];
        });

        // Booleans/Enums
        ['side', 'wireframe', 'toneMapped', 'transparent', 'visible'].forEach(key => {
            if (key in mat) state[key] = mat[key];
        });

        // Refs
        state.envMap = mat.envMap;
        if (mat.envMapRotation) state.envMapRotation = mat.envMapRotation.clone();

        return state;
    }

    //
    // --- Private UI Creation Methods ---
    //

    _createPanel() {
        this.panel = document.createElement('div');
        Object.assign(this.panel.style, {
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'block',
            minWidth: '280px',
            border: '1px solid #ccc',
            userSelect: 'text'
        });

        this.head = document.createElement('div');
        Object.assign(this.head.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            background: '#333',
            color: 'white',
            padding: '8px 10px',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            letterSpacing: '1px',
            userSelect: 'none'
        });

        const title = document.createElement('span');
        title.textContent = 'CUSTOMIZER';
        this.chevron = document.createElement('span');
        this.chevron.innerHTML = '&#x25BC;';
        this.head.appendChild(title);
        this.head.appendChild(this.chevron);

        this.body = document.createElement('div');
        Object.assign(this.body.style, {
            padding: '0',
            fontSize: '11px',
            transition: 'max-height 0.2s',
            maxHeight: '80vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            background: '#fff'
        });

        this.sectionTitleStyle = {
            fontWeight: 'bold',
            color: '#1976d2',
            fontSize: '12px',
            marginBottom: '8px',
            borderBottom: '1px solid #ddd',
            paddingBottom: '4px'
        };
    }

    _createGetSection(bgColor) {
        this.getSection = document.createElement('div');
        Object.assign(this.getSection.style, {
            padding: '10px',
            background: bgColor,
            borderBottom: '1px solid #eee'
        });

        const radioRow = document.createElement('div');
        radioRow.style.marginBottom = '8px';
        radioRow.style.display = 'flex';
        radioRow.style.gap = '15px';

        const nameRadio = this._createRadio('name', 'Search by Name', 'search-mode', this.searchBy === 'name');
        const uuidRadio = this._createRadio('uuid', 'Search by UUID', 'search-mode', this.searchBy === 'uuid');

        this.nameRadio = nameRadio.input;
        this.uuidRadio = uuidRadio.input;

        radioRow.appendChild(nameRadio.row);
        radioRow.appendChild(uuidRadio.row);

        const getTitle = document.createElement('div');
        getTitle.textContent = 'Find Object';
        Object.assign(getTitle.style, this.sectionTitleStyle);

        const inputRow = document.createElement('div');
        inputRow.style.display = 'flex';
        inputRow.style.alignItems = 'center';
        inputRow.style.marginBottom = '4px';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Enter name or UUID';
        Object.assign(this.input.style, {
            flex: '1',
            padding: '5px 8px',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            fontFamily: 'monospace',
            marginRight: '6px'
        });

        this.btn = document.createElement('button');
        this.btn.textContent = 'Get';
        Object.assign(this.btn.style, {
            padding: '5px 12px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontWeight: 'bold',
            fontSize: '11px',
            cursor: 'pointer'
        });

        inputRow.appendChild(this.input);
        inputRow.appendChild(this.btn);

        this.getSection.appendChild(getTitle);
        this.getSection.appendChild(radioRow);
        this.getSection.appendChild(inputRow);
    }

    _createObjectInfoSection(bgColor) {
        this.infoSection = document.createElement('div');
        Object.assign(this.infoSection.style, {
            padding: '10px',
            background: bgColor,
            borderBottom: '1px solid #eee'
        });

        const infoTitle = document.createElement('div');
        infoTitle.textContent = 'Object info';
        Object.assign(infoTitle.style, this.sectionTitleStyle);

        this.infoContent = document.createElement('div');
        this.infoContent.style.fontSize = '11px';
        this.infoContent.style.marginBottom = '8px';
        this.infoContent.style.lineHeight = '1.4';

        // Note: These visual helpers don't need reset logic usually, so we use simple createCheckbox
        this.showObjCheckbox = this._createSimpleCheckbox('Show object', 'show-object-visibility');
        this.axesCheckbox = this._createSimpleCheckbox('Show axes helper', 'axes-visibility');
        this.receiveShadowCheckbox = this._createSimpleCheckbox('Receive shadow', 'receive-shadow-visibility');
        this.castShadowCheckbox = this._createSimpleCheckbox('Cast shadow', 'cast-shadow-visibility');

        this.infoSection.appendChild(infoTitle);
        this.infoSection.appendChild(this.infoContent);
        this.infoSection.appendChild(this.showObjCheckbox.row);
        this.infoSection.appendChild(this.axesCheckbox.row);
        this.infoSection.appendChild(this.receiveShadowCheckbox.row);
        this.infoSection.appendChild(this.castShadowCheckbox.row);
    }

    _createCustomizeSections() {
        this.customizeSection = this._createSectionContainer('Customize object', '#ffffff');
        this.childrenSection = this._createSectionContainer('Children info', '#f7f7f7');
        this.matSection = this._createSectionContainer('Customize material', '#f7f7f7');
        this.lightSection = this._createSectionContainer('Customize light', '#ffffff');
    }

    _createDescendantMaterialsSection() {
        this.descMatSection = this._createSectionContainer("Descendants' Materials", '#ffffff');
    }

    _createCopyMaterialSection() {
        this.copyMatSection = this._createSectionContainer('Copy material from object', '#f7f7f7');
        const body = this.copyMatSection.querySelector('.section-body');

        const searchRow = document.createElement('div');
        searchRow.style.display = 'flex';
        searchRow.style.gap = '8px';

        this.copyMatInput = document.createElement('input');
        this.copyMatInput.type = 'text';
        this.copyMatInput.placeholder = 'Source object name';
        Object.assign(this.copyMatInput.style, {
            flex: '1',
            padding: '4px',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            fontFamily: 'monospace'
        });

        const searchBtn = document.createElement('button');
        searchBtn.textContent = 'Search';
        Object.assign(searchBtn.style, {
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '11px',
            background: '#ddd',
            border: '1px solid #ccc',
            borderRadius: '3px'
        });

        searchRow.appendChild(this.copyMatInput);
        searchRow.appendChild(searchBtn);
        body.appendChild(searchRow);

        this.copyMatInfo = document.createElement('div');
        Object.assign(this.copyMatInfo.style, {
            marginTop: '8px',
            fontSize: '11px',
            color: '#555',
            display: 'none',
            border: '1px dashed #ccc',
            padding: '6px',
            background: '#fff'
        });
        body.appendChild(this.copyMatInfo);

        this.copyMatActions = document.createElement('div');
        Object.assign(this.copyMatActions.style, {
            marginTop: '8px',
            display: 'none',
            gap: '8px'
        });

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy Material';
        Object.assign(copyBtn.style, {
            flex: '1',
            padding: '5px',
            cursor: 'pointer',
            fontSize: '11px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '3px'
        });

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Material';
        Object.assign(resetBtn.style, {
            flex: '1',
            padding: '5px',
            cursor: 'pointer',
            fontSize: '11px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '3px'
        });

        this.copyMatActions.appendChild(copyBtn);
        this.copyMatActions.appendChild(resetBtn);
        body.appendChild(this.copyMatActions);

        let foundSourceObj = null;

        searchBtn.onclick = () => {
            const name = this.copyMatInput.value.trim();
            if (!name) return;
            foundSourceObj = this.scene.getObjectByName(name);
            if (foundSourceObj) {
                const matName = foundSourceObj.material ? (foundSourceObj.material.name || 'Unnamed Material') : 'No Material';
                this.copyMatInfo.style.display = 'block';
                this.copyMatInfo.innerHTML = `<div><b>Found:</b> ${foundSourceObj.name}</div><div><b>Material:</b> ${matName}</div>`;
                this.copyMatActions.style.display = foundSourceObj.material ? 'flex' : 'none';
            } else {
                this.copyMatInfo.style.display = 'block';
                this.copyMatInfo.innerHTML = `<span style="color:red">Object "${name}" not found.</span>`;
                this.copyMatActions.style.display = 'none';
            }
        };

        copyBtn.onclick = () => {
            if (!this.selectedObject || !foundSourceObj || !foundSourceObj.material) return;
            if (!this.currentOriginalMaterial) this.currentOriginalMaterial = this.selectedObject.material;
            this.selectedObject.material = foundSourceObj.material;
            this._populateMaterialPanel();
        };

        resetBtn.onclick = () => {
            if (!this.selectedObject || !this.currentOriginalMaterial) return;
            this.selectedObject.material = this.currentOriginalMaterial;
            this.currentOriginalMaterial = null;
            this._populateMaterialPanel();
        };
    }

    _composePanel() {
        this.getSection.style.background = '#ffffff';
        this.body.appendChild(this.getSection);
        this.infoSection.style.background = '#f9f9f9';
        this.body.appendChild(this.infoSection);
        this.customizeSection.style.background = '#ffffff';
        this.body.appendChild(this.customizeSection);
        this.childrenSection.style.background = '#f9f9f9';
        this.body.appendChild(this.childrenSection);
        this.descMatSection.style.background = '#ffffff';
        this.body.appendChild(this.descMatSection);
        this.matSection.style.background = '#f9f9f9';
        this.body.appendChild(this.matSection);
        this.copyMatSection.style.background = '#ffffff';
        this.body.appendChild(this.copyMatSection);
        this.lightSection.style.background = '#f9f9f9';
        this.body.appendChild(this.lightSection);

        this.panel.appendChild(this.head);
        this.panel.appendChild(this.body);
        document.body.appendChild(this.panel);
    }

    //
    // --- Event Handling & Logic ---
    //

    _setupEventListeners() {
        this.btn.onclick = () => this._findAndDisplayObject();
        this.nameRadio.onchange = () => {
            if (this.nameRadio.checked) {
                this.searchBy = 'name';
                this.input.placeholder = 'Enter a name';
            }
        };
        this.uuidRadio.onchange = () => {
            if (this.uuidRadio.checked) {
                this.searchBy = 'uuid';
                this.input.placeholder = 'Enter a UUID';
            }
        };

        this.showObjCheckbox.checkbox.onchange = () => {
            if (this.selectedObject) this.selectedObject.visible = this.showObjCheckbox.checkbox.checked;
        };
        this.receiveShadowCheckbox.checkbox.onchange = () => {
            if (this.selectedObject) this.selectedObject.receiveShadow = this.receiveShadowCheckbox.checkbox.checked;
        };
        this.castShadowCheckbox.checkbox.onchange = () => {
            if (this.selectedObject) this.selectedObject.castShadow = this.castShadowCheckbox.checkbox.checked;
        };

        this.axesCheckbox.checkbox.onchange = () => {
            const isChecked = this.axesCheckbox.checkbox.checked;
            this.AxesHelper.visible = isChecked;
            if (isChecked && this.selectedObject) {
                if (this.AxesHelper.parent) this.AxesHelper.parent.remove(this.AxesHelper);
                this.selectedObject.add(this.AxesHelper);
            } else if (this.AxesHelper.parent) {
                this.AxesHelper.parent.remove(this.AxesHelper);
                this.scene.add(this.AxesHelper);
            }
        };

        let isDragging = false,
            dragMoved = false,
            dragOffsetX = 0,
            dragOffsetY = 0;
        this.head.onmousedown = (e) => {
            isDragging = true;
            dragMoved = false;
            const rect = this.panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            Object.assign(this.panel.style, {
                position: 'absolute',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                right: '',
                bottom: ''
            });
            document.body.style.userSelect = 'none';
        };
        document.onmousemove = (e) => {
            if (!isDragging) return;
            this.panel.style.left = `${e.clientX - dragOffsetX}px`;
            this.panel.style.top = `${e.clientY - dragOffsetY}px`;
            dragMoved = true;
        };
        document.onmouseup = () => {
            if (isDragging) {
                setTimeout(() => {
                    dragMoved = false;
                }, 0);
                isDragging = false;
                document.body.style.userSelect = '';
            }
        };

        let collapsed = false;
        this.head.onclick = () => {
            if (dragMoved) return;
            collapsed = !collapsed;
            this.body.style.maxHeight = collapsed ? '0' : '80vh';
            this.body.style.padding = collapsed ? '0' : '0';
            this.chevron.innerHTML = collapsed ? '&#x25B2;' : '&#x25BC;';
        };
    }

    _findAndDisplayObject() {
        this._resetUIState();
        const value = this.input.value.trim();
        if (!value) {
            this.infoContent.textContent = 'Please enter a value.';
            return;
        }

        if (this.searchBy === 'name') this.selectedObject = this.scene.getObjectByName(value);
        else if (this.searchBy === 'uuid') this.selectedObject = this.scene.getObjectByProperty('uuid', value);

        if (!this.selectedObject) {
            this.infoContent.textContent = `No object found with ${this.searchBy}: "${value}"`;
            return;
        }

        console.log(this.selectedObject);
        this._populateAllSections();
    }

    _populateAllSections() {
        if (!this.selectedObject) return;
        this._updateInfoPanel();
        this._populateCustomizePanel();
        this._populateChildrenPanel();
        this._populateDescendantMaterialsSection();
        this._populateMaterialPanel();
        this.copyMatSection.style.display = 'block';
        this._populateLightPanel();
    }

    _updateInfoPanel() {
        const obj = this.selectedObject;
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);

        this.infoContent.innerHTML = `
            <div><b>UUID:</b> ${obj.uuid}</div>
            <div><b>Name:</b> ${obj.name || '(unnamed)'}</div>
            <div style="font-size:10px;color:#888; margin-top:4px;">World: x:${worldPos.x.toFixed(2)}, y:${worldPos.y.toFixed(2)}, z:${worldPos.z.toFixed(2)}</div>
            <div><b>Position:</b> x:${obj.position.x.toFixed(2)}, y:${obj.position.y.toFixed(2)}, z:${obj.position.z.toFixed(2)}</div>
        `;
        this.showObjCheckbox.checkbox.disabled = false;
        this.showObjCheckbox.checkbox.checked = obj.visible;
        this.axesCheckbox.checkbox.disabled = false;
        this.axesCheckbox.checkbox.checked = this.AxesHelper.parent === obj;
        this.receiveShadowCheckbox.checkbox.disabled = false;
        this.receiveShadowCheckbox.checkbox.checked = !!obj.receiveShadow;
        this.castShadowCheckbox.checkbox.disabled = false;
        this.castShadowCheckbox.checkbox.checked = !!obj.castShadow;
    }

    _populateCustomizePanel() {
        const obj = this.selectedObject;
        const body = this.customizeSection.querySelector('.section-body');
        body.innerHTML = '';

        // 1. Capture/Retrieve Original State
        if (!obj.userData.originalState) {
            obj.userData.originalState = this._getObjectState(obj);
        }
        if (obj.userData.originalState.isRapierBound === undefined) {
            obj.userData.originalState.isRapierBound = !!obj.isRapierBound;
        }
        const originalState = obj.userData.originalState;

        // Reset Button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Transform';
        Object.assign(resetBtn.style, {
            padding: '4px',
            marginBottom: '8px',
            cursor: 'pointer',
            alignSelf: 'flex-start',
            background: '#ffeb3b',
            border: '1px solid #fbc02d',
            borderRadius: '3px',
            fontSize: '10px'
        });
        resetBtn.onclick = () => {
            obj.position.copy(originalState.position);
            obj.rotation.copy(originalState.rotation);
            obj.scale.copy(originalState.scale);
            obj.isRapierBound = originalState.isRapierBound;
            this._populateCustomizePanel(); // Refresh UI
            this._updateInfoPanel();
        };
        body.appendChild(resetBtn);

        // Rapier Physics Check (Using Smart Checkbox)
        const togglePhysics = (isBound) => {
            obj.isRapierBound = isBound;
            warningDiv.style.display = isBound ? 'block' : 'none';
            const allInputs = body.querySelectorAll('input[type="number"]');
            allInputs.forEach(input => {
                input.disabled = isBound;
                if (!input.dataset.isDirty) input.style.color = isBound ? '#aaa' : 'black';
            });
        };

        const rapierCheckData = this._createCheckbox(
            'Bound by Rapier Body',
            `rapier-bound-${obj.uuid}`,
            !!obj.isRapierBound,
            (val) => togglePhysics(val),
            originalState.isRapierBound
        );
        body.appendChild(rapierCheckData.row);

        const warningDiv = document.createElement('div');
        Object.assign(warningDiv.style, {
            color: '#d32f2f',
            background: '#ffebee',
            padding: '6px',
            borderRadius: '4px',
            fontSize: '10px',
            marginTop: '4px',
            marginBottom: '8px',
            border: '1px solid #ffcdd2',
            lineHeight: '1.3',
            display: 'none'
        });
        warningDiv.innerHTML = '<b>Warning:</b> Position & Rotation controlled by Physics.';
        body.appendChild(warningDiv);

        // Position, Rotation, Scale
        const posRow = this._createEditRow('Position:', obj.position, () => this._updateInfoPanel(), originalState.position, 1.0);
        body.appendChild(posRow);

        const rotRow = this._createEditRow('Rotation:', obj.rotation, () => this._updateInfoPanel(), originalState.rotation, 0.1);
        body.appendChild(rotRow);

        // Look At Camera
        const lookAtBtn = document.createElement('button');
        lookAtBtn.textContent = 'Look at Camera';
        Object.assign(lookAtBtn.style, {
            marginTop: '4px',
            marginBottom: '8px',
            padding: '4px 8px',
            width: '100%',
            cursor: 'pointer',
            background: '#eee',
            border: '1px solid #ccc',
            borderRadius: '3px',
            fontSize: '11px'
        });
        lookAtBtn.onclick = () => {
            const targetCamera = this.camera || (this.scene && this.scene.camera);
            if (targetCamera) {
                obj.lookAt(targetCamera.position);
                const rotInputs = rotRow.querySelectorAll('input');
                rotInputs.forEach(inp => inp.dispatchEvent(new Event('change')));
                this._populateCustomizePanel();
            } else {
                console.warn('Customizer: No camera found.');
            }
        };
        body.appendChild(lookAtBtn);

        body.appendChild(this._createEditRow('Scale:', obj.scale, () => this._updateInfoPanel(), originalState.scale, 0.1));

        togglePhysics(!!obj.isRapierBound);
        this.customizeSection.style.display = 'block';
    }

    _populateChildrenPanel() {
        const obj = this.selectedObject;
        const body = this.childrenSection.querySelector('.section-body');
        body.innerHTML = '';

        if (obj.children && obj.children.length > 0) {
            const countInfo = document.createElement('div');
            countInfo.textContent = `Direct children: ${obj.children.length}`;
            countInfo.style.marginBottom = '5px';
            body.appendChild(countInfo);

            obj.children.forEach(child => {
                const childType = child.type || 'Object3D';
                const childName = child.name || '(unnamed)';
                const labelText = `[${childType}] ${childName}`;

                const checkboxData = this._createSimpleCheckbox(labelText, `child-vis-${child.uuid}`);
                checkboxData.checkbox.checked = child.visible;
                checkboxData.checkbox.onchange = () => child.visible = checkboxData.checkbox.checked;

                const btnContainer = document.createElement('div');
                btnContainer.style.marginLeft = 'auto';

                const copyBtn = this._createCopyButton(childName);
                btnContainer.appendChild(copyBtn);
                checkboxData.row.appendChild(btnContainer);
                body.appendChild(checkboxData.row);
            });
            this.childrenSection.style.display = 'block';
        } else {
            this.childrenSection.style.display = 'none';
        }
    }

    _populateDescendantMaterialsSection() {
        const obj = this.selectedObject;
        const body = this.descMatSection.querySelector('.section-body');
        body.innerHTML = '';

        const materialsMap = new Map();

        obj.traverse((child) => {
            if (child.isMesh && child.material) {
                const childMats = Array.isArray(child.material) ? child.material : [child.material];
                childMats.forEach(mat => {
                    if (!materialsMap.has(mat.uuid)) {
                        materialsMap.set(mat.uuid, {
                            mat: mat,
                            meshes: []
                        });
                    }
                    materialsMap.get(mat.uuid).meshes.push(child);
                });
            }
        });

        if (materialsMap.size > 0) {
            const countInfo = document.createElement('div');
            countInfo.textContent = `Unique Materials found: ${materialsMap.size}`;
            countInfo.style.marginBottom = '5px';
            body.appendChild(countInfo);

            materialsMap.forEach((data, uuid) => {
                const {
                    mat,
                    meshes
                } = data;
                const matName = mat.name || '(unnamed material)';
                const labelText = matName;

                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    cursor: 'pointer',
                    padding: '2px 0'
                });
                row.onmouseover = () => {
                    row.style.background = '#f0f0f0';
                };
                row.onmouseout = () => {
                    row.style.background = 'transparent';
                };

                const outerVisCheckbox = document.createElement('input');
                outerVisCheckbox.type = 'checkbox';
                outerVisCheckbox.checked = mat.visible;
                outerVisCheckbox.id = `desc-outer-vis-${mat.uuid}`;
                outerVisCheckbox.style.marginRight = '8px';

                outerVisCheckbox.onclick = (e) => {
                    e.stopPropagation();
                    mat.visible = outerVisCheckbox.checked;
                    mat.needsUpdate = true;
                    const innerChecks = document.querySelectorAll(`.inner-vis-check[data-uuid="${mat.uuid}"]`);
                    innerChecks.forEach(chk => chk.checked = outerVisCheckbox.checked);
                    // Trigger refresh if currently open to show red text potentially
                };

                const labelContainer = document.createElement('div');
                Object.assign(labelContainer.style, {
                    display: 'flex',
                    alignItems: 'center',
                    flex: '1',
                    overflow: 'hidden'
                });
                const label = document.createElement('span');
                label.textContent = labelText;
                label.title = labelText;
                Object.assign(label.style, {
                    fontSize: '11px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                });

                labelContainer.appendChild(outerVisCheckbox);
                labelContainer.appendChild(label);
                row.appendChild(labelContainer);

                const btnContainer = document.createElement('div');
                Object.assign(btnContainer.style, {
                    display: 'flex',
                    gap: '5px',
                    alignItems: 'center',
                    marginLeft: '8px'
                });
                const chevron = document.createElement('div');
                chevron.innerHTML = '&#9654;';
                Object.assign(chevron.style, {
                    fontSize: '12px',
                    color: '#555',
                    padding: '0 5px',
                    transition: 'transform 0.2s'
                });

                const inlineMatContainer = document.createElement('div');
                Object.assign(inlineMatContainer.style, {
                    marginTop: '5px',
                    marginBottom: '10px',
                    marginLeft: '5px',
                    marginRight: '5px',
                    border: '1px solid #ccc',
                    background: '#e0e0e0',
                    padding: '8px',
                    borderRadius: '4px',
                    display: 'none',
                    flexDirection: 'column',
                    gap: '5px',
                    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.05)'
                });

                let isOpen = false;
                row.onclick = (e) => {
                    isOpen = !isOpen;
                    inlineMatContainer.style.display = isOpen ? 'flex' : 'none';
                    chevron.innerHTML = isOpen ? '&#9660;' : '&#9654;';

                    if (isOpen) {
                        inlineMatContainer.innerHTML = '';
                        this._generateMaterialUI(mat, inlineMatContainer);

                        const separator = document.createElement('hr');
                        Object.assign(separator.style, {
                            width: '100%',
                            border: '0',
                            borderTop: '1px solid #ccc',
                            margin: '8px 0'
                        });
                        inlineMatContainer.appendChild(separator);

                        const meshListTitle = document.createElement('div');
                        meshListTitle.innerHTML = `<b>Meshes using this material</b> (${meshes.length})`;
                        Object.assign(meshListTitle.style, {
                            fontSize: '10px',
                            marginBottom: '6px'
                        });
                        inlineMatContainer.appendChild(meshListTitle);

                        const meshListContainer = document.createElement('div');
                        Object.assign(meshListContainer.style, {
                            maxHeight: '150px',
                            overflowY: 'auto',
                            paddingRight: '4px'
                        });

                        meshes.forEach(mesh => {
                            const meshRow = document.createElement('div');
                            Object.assign(meshRow.style, {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px'
                            });
                            const meshCheck = document.createElement('input');
                            meshCheck.type = 'checkbox';
                            meshCheck.checked = mesh.visible;
                            meshCheck.onchange = () => {
                                mesh.visible = meshCheck.checked;
                            };
                            meshCheck.onclick = (ev) => ev.stopPropagation();
                            const meshLabel = document.createElement('span');
                            meshLabel.textContent = mesh.name || `(${mesh.type})`;
                            Object.assign(meshLabel.style, {
                                fontSize: '10px',
                                color: '#333'
                            });
                            meshRow.appendChild(meshCheck);
                            meshRow.appendChild(meshLabel);
                            meshListContainer.appendChild(meshRow);
                        });
                        inlineMatContainer.appendChild(meshListContainer);
                    }
                };

                btnContainer.appendChild(chevron);
                row.appendChild(btnContainer);

                body.appendChild(row);
                body.appendChild(inlineMatContainer);
            });
            this.descMatSection.style.display = 'block';
        } else {
            this.descMatSection.style.display = 'none';
        }
    }

    _populateMaterialPanel() {
        const obj = this.selectedObject;
        let mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (!mat || !mat.isMaterial) {
            this.matSection.style.display = 'none';
            return;
        }
        const body = this.matSection.querySelector('.section-body');
        body.innerHTML = '';
        this._generateMaterialUI(mat, body);
        this.matSection.style.display = 'block';
    }

    _generateMaterialUI(mat, container) {
        if (!mat.userData.originalState) {
            mat.userData.originalState = this._getMaterialState(mat);
        }
        const originalState = mat.userData.originalState;

        const header = document.createElement('div');
        Object.assign(header.style, {
            borderBottom: '1px solid #ccc',
            paddingBottom: '4px',
            marginBottom: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
        });

        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <div><b>Type:</b> ${mat.type}</div>
            <div><b>Name:</b> ${mat.name || 'N/A'}</div>
            <div style="font-size:9px; color:#555; margin-top:2px;">${mat.uuid}</div>
        `;

        // Reset Button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset';
        Object.assign(resetBtn.style, {
            fontSize: '9px',
            padding: '2px 6px',
            cursor: 'pointer',
            background: '#ffeb3b',
            border: '1px solid #fbc02d',
            borderRadius: '3px'
        });
        resetBtn.onclick = () => {
            if (mat.color && originalState.color !== undefined) mat.color.setHex(originalState.color);
            if (mat.emissive && originalState.emissive !== undefined) mat.emissive.setHex(originalState.emissive);
            ['metalness', 'roughness', 'emissiveIntensity', 'envMapIntensity', 'opacity', 'side', 'wireframe', 'toneMapped', 'transparent', 'visible'].forEach(key => {
                if (originalState[key] !== undefined) mat[key] = originalState[key];
            });
            mat.envMap = originalState.envMap;
            if (mat.envMapRotation && originalState.envMapRotation) mat.envMapRotation.copy(originalState.envMapRotation);
            mat.needsUpdate = true;

            // Re-render
            container.innerHTML = '';
            this._generateMaterialUI(mat, container);
        };

        header.appendChild(infoDiv);
        header.appendChild(resetBtn);
        container.appendChild(header);

        const idSuffix = Math.random().toString(36).substr(2, 5);

        // EnvMap
        const envMapCheckboxData = this._createCheckbox(
            'Use Scene EnvMap',
            `mat-envmap-${mat.uuid}-${idSuffix}`,
            !!mat.envMap,
            (isChecked) => {
                mat.envMap = isChecked ? (this.scene.environment || null) : null;
                mat.needsUpdate = true;
                this._generateMaterialUI(mat, container);
            },
            !!originalState.envMap
        );
        container.appendChild(envMapCheckboxData.row);

        let envMapIntensityRow = null;
        if ('envMapIntensity' in mat)
            envMapIntensityRow = this._createMaterialControl('EnvMap Intensity', 'range', mat.envMapIntensity, v => mat.envMapIntensity = v, {
                max: 20,
                step: 0.1
            }, originalState.envMapIntensity);

        let envMapRotationContainer = null;
        if ('envMapRotation' in mat) {
            envMapRotationContainer = document.createElement('div');
            Object.assign(envMapRotationContainer.style, {
                marginTop: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
            });

            const rotLabel = document.createElement('div');
            rotLabel.textContent = 'EnvMap Rotation (rad):';
            rotLabel.style.marginBottom = '2px';
            envMapRotationContainer.appendChild(rotLabel);

            ['x', 'y', 'z'].forEach(axis => {
                const sliderRow = this._createMaterialControl(
                    `Rotation ${axis.toUpperCase()}`,
                    'range',
                    mat.envMapRotation[axis],
                    (val) => {
                        mat.envMapRotation[axis] = val;
                        mat.needsUpdate = true;
                    },
                    { max: Math.PI * 2, step: 0.01 },
                    originalState.envMapRotation ? originalState.envMapRotation[axis] : 0
                );
                envMapRotationContainer.appendChild(sliderRow);
            });
        }

        const updateEnvMapVisibility = () => {
            const isChecked = envMapCheckboxData.checkbox.checked;
            mat.envMap = isChecked ? (this.scene.environment || null) : null;
            mat.needsUpdate = true;
            if (envMapIntensityRow) envMapIntensityRow.style.display = isChecked ? 'flex' : 'none';
            if (envMapRotationContainer) envMapRotationContainer.style.display = isChecked ? 'flex' : 'none';
        };

        if (envMapIntensityRow) envMapIntensityRow.style.display = envMapCheckboxData.checkbox.checked ? 'flex' : 'none';
        if (envMapRotationContainer) envMapRotationContainer.style.display = envMapCheckboxData.checkbox.checked ? 'flex' : 'none';
        envMapCheckboxData.checkbox.onchange = updateEnvMapVisibility; // Hook into raw element for UI toggle logic
        if (envMapIntensityRow) container.appendChild(envMapIntensityRow);
        if (envMapRotationContainer) container.appendChild(envMapRotationContainer);

        // Side (Radio)
        const sideRow = document.createElement('div');
        Object.assign(sideRow.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '8px'
        });
        const sideLabel = document.createElement('span');
        sideLabel.textContent = 'Side:';
        sideLabel.style.width = '110px';

        this._handleDirtyState(sideLabel, mat.side, originalState.side, () => {
            mat.side = originalState.side;
            mat.needsUpdate = true;
            this._generateMaterialUI(mat, container);
        });
        sideRow.appendChild(sideLabel);

        const radioContainer = document.createElement('div');
        Object.assign(radioContainer.style, {
            display: 'flex',
            gap: '10px'
        });
        const sideOptions = [{
            label: 'Front',
            value: THREE.FrontSide
        }, {
            label: 'Back',
            value: THREE.BackSide
        }, {
            label: 'Double',
            value: THREE.DoubleSide
        }];
        const groupName = `mat-side-${mat.uuid}-${idSuffix}`;
        sideOptions.forEach(opt => {
            const radioData = this._createRadio(opt.value, opt.label, groupName, mat.side === opt.value);
            radioData.input.onchange = () => {
                if (radioData.input.checked) {
                    mat.side = opt.value;
                    mat.needsUpdate = true;
                    this._generateMaterialUI(mat, container);
                }
            };
            radioContainer.appendChild(radioData.row);
        });
        sideRow.appendChild(radioContainer);
        container.appendChild(sideRow);

        if (mat.color) container.appendChild(this._createMaterialControl('Color', 'color', mat.color, v => mat.color.set(v), {}, originalState.color));
        if ('metalness' in mat) container.appendChild(this._createMaterialControl('Metalness', 'range', mat.metalness, v => mat.metalness = v, {
            max: 1
        }, originalState.metalness));
        if ('roughness' in mat) container.appendChild(this._createMaterialControl('Roughness', 'range', mat.roughness, v => mat.roughness = v, {
            max: 1
        }, originalState.roughness));
        if ('emissive' in mat) container.appendChild(this._createMaterialControl('Emissive Color', 'color', mat.emissive, v => mat.emissive.set(v), {}, originalState.emissive));
        if ('emissiveIntensity' in mat) container.appendChild(this._createMaterialControl('Emissive Intensity', 'range', mat.emissiveIntensity, v => mat.emissiveIntensity = v, {
            max: 5,
            step: 0.1
        }, originalState.emissiveIntensity));

        const wireframeCheck = this._createCheckbox(
            'Wireframe',
            `mat-wire-${mat.uuid}-${idSuffix}`,
            !!mat.wireframe,
            (val) => {
                mat.wireframe = val;
                mat.needsUpdate = true;
                this._generateMaterialUI(mat, container);
            },
            !!originalState.wireframe
        );
        container.appendChild(wireframeCheck.row);

        if ('toneMapped' in mat) {
            const toneCheck = this._createCheckbox(
                'toneMapped',
                `mat-tone-${mat.uuid}-${idSuffix}`,
                !!mat.toneMapped,
                (val) => {
                    mat.toneMapped = val;
                    mat.needsUpdate = true;
                    this._generateMaterialUI(mat, container);
                },
                !!originalState.toneMapped
            );
            container.appendChild(toneCheck.row);
        }

        if ('transparent' in mat) {
            const transCheck = this._createCheckbox(
                'Transparent',
                `mat-trans-${mat.uuid}-${idSuffix}`,
                !!mat.transparent,
                (val) => {
                    mat.transparent = val;
                    mat.needsUpdate = true;
                    this._generateMaterialUI(mat, container);
                },
                !!originalState.transparent
            );

            let opacityRow = null;
            if ('opacity' in mat) {
                opacityRow = this._createMaterialControl('Opacity', 'range', mat.opacity, v => {
                    mat.opacity = v;
                }, {
                    max: 1
                }, originalState.opacity);
                opacityRow.style.display = transCheck.checkbox.checked ? 'flex' : 'none';
            }
            container.appendChild(transCheck.row);
            if (opacityRow) container.appendChild(opacityRow);
        } else if ('opacity' in mat) {
            container.appendChild(this._createMaterialControl('Opacity', 'range', mat.opacity, v => {
                mat.opacity = v;
            }, {
                max: 1
            }, originalState.opacity));
        }

        const visibleCheck = this._createCheckbox(
            'Visible',
            `mat-vis-${mat.uuid}-${idSuffix}`,
            mat.visible,
            (val) => {
                mat.visible = val;
                mat.needsUpdate = true;
                const outerCheck = document.getElementById(`desc-outer-vis-${mat.uuid}`);
                if (outerCheck) outerCheck.checked = val;
            },
            !!originalState.visible
        );
        visibleCheck.checkbox.classList.add('inner-vis-check');
        visibleCheck.checkbox.setAttribute('data-uuid', mat.uuid);
        container.appendChild(visibleCheck.row);
    }

    _populateLightPanel() {
        const obj = this.selectedObject;
        if (!obj.isLight) {
            this.lightSection.style.display = 'none';
            return;
        }
        const body = this.lightSection.querySelector('.section-body');
        body.innerHTML = '';
        const lightInfo = document.createElement('div');
        lightInfo.innerHTML = `<div><b>Type:</b> ${obj.type}</div>`;
        body.appendChild(lightInfo);
        if (obj.color) body.appendChild(this._createMaterialControl('Color', 'color', obj.color, v => obj.color.set(v)));
        if ('intensity' in obj) body.appendChild(this._createMaterialControl('Intensity', 'range', obj.intensity, v => obj.intensity = v, {
            max: 10000,
            step: 1
        }));
        if ('distance' in obj) body.appendChild(this._createMaterialControl('Distance', 'range', obj.distance, v => obj.distance = v, {
            max: 100,
            step: 0.1
        }));
        if ('decay' in obj) body.appendChild(this._createMaterialControl('Decay', 'range', obj.decay, v => obj.decay = v, {
            max: 5,
            step: 0.1
        }));
        this.lightSection.style.display = 'block';
    }

    _resetUIState() {
        this.selectedObject = null;
        this.currentOriginalMaterial = null;
        this.infoContent.textContent = '';
        this.showObjCheckbox.checkbox.disabled = true;
        this.showObjCheckbox.checkbox.checked = false;
        this.axesCheckbox.checkbox.disabled = true;
        this.axesCheckbox.checkbox.checked = false;
        this.receiveShadowCheckbox.checkbox.disabled = true;
        this.receiveShadowCheckbox.checkbox.checked = false;
        this.castShadowCheckbox.checkbox.disabled = true;
        this.castShadowCheckbox.checkbox.checked = false;
        if (this.AxesHelper.parent) this.AxesHelper.parent.remove(this.AxesHelper);
        this.scene.add(this.AxesHelper);
        this.AxesHelper.visible = false;

        this.customizeSection.style.display = 'none';
        this.childrenSection.style.display = 'none';
        this.descMatSection.style.display = 'none';
        this.matSection.style.display = 'none';
        this.lightSection.style.display = 'none';
        this.copyMatSection.style.display = 'none';
        this.copyMatInput.value = '';
        this.copyMatInfo.style.display = 'none';
        this.copyMatActions.style.display = 'none';
    }

    //
    // --- UI Element Creator Helpers ---
    //

    _createSectionContainer(title, bgColor = '#ffffff') {
        const section = document.createElement('div');
        section.style.display = 'none';
        Object.assign(section.style, {
            padding: '10px',
            background: bgColor,
            borderBottom: '1px solid #eee'
        });
        const sectionTitle = document.createElement('div');
        sectionTitle.textContent = title;
        Object.assign(sectionTitle.style, this.sectionTitleStyle);
        const sectionBody = document.createElement('div');
        sectionBody.className = 'section-body';
        sectionBody.style.display = 'flex';
        sectionBody.style.flexDirection = 'column';
        sectionBody.style.gap = '8px';
        section.appendChild(sectionTitle);
        section.appendChild(sectionBody);
        return section;
    }

    _createSimpleCheckbox(labelText, id) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.marginTop = '4px';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        const label = document.createElement('label');
        label.textContent = labelText;
        label.htmlFor = id;
        Object.assign(label.style, {
            fontSize: '11px',
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '140px'
        });
        row.appendChild(checkbox);
        row.appendChild(label);
        return {
            row,
            checkbox,
            label
        };
    }

    // New Smart Checkbox with Red Text + Click to Reset
    _createCheckbox(labelText, id, checked, onChange, originalValue = undefined) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.marginTop = '4px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.checked = checked;

        const label = document.createElement('label');
        label.textContent = labelText;
        label.htmlFor = id;
        Object.assign(label.style, {
            fontSize: '11px',
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '140px'
        });

        const checkDirty = () => {
            this._handleDirtyState(label, checkbox.checked, originalValue, () => {
                checkbox.checked = originalValue;
                if (onChange) onChange(originalValue);
                checkDirty();
            });
        };

        checkbox.onchange = () => {
            if (onChange) onChange(checkbox.checked);
            checkDirty();
        };

        row.appendChild(checkbox);
        row.appendChild(label);
        checkDirty(); // Init check
        return {
            row,
            checkbox,
            label
        };
    }

    _createRadio(value, labelText, groupName, checked = false) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '4px';
        const input = document.createElement('input');
        input.type = 'radio';
        input.id = `${groupName}-${value}`;
        input.name = groupName;
        input.value = value;
        input.checked = checked;
        const label = document.createElement('label');
        label.textContent = labelText;
        label.htmlFor = input.id;
        Object.assign(label.style, {
            fontSize: '11px',
            cursor: 'pointer'
        });
        row.appendChild(input);
        row.appendChild(label);
        return {
            row,
            input,
            label
        };
    }

    _createCopyButton(textToCopy) {
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        Object.assign(copyBtn.style, {
            fontSize: '9px',
            padding: '2px 6px',
            cursor: 'pointer',
            border: '1px solid #ccc',
            background: '#fff',
            borderRadius: '3px'
        });
        copyBtn.onclick = (e) => {
            if (e) e.stopPropagation();
            const dummy = document.createElement("textarea");
            document.body.appendChild(dummy);
            dummy.value = textToCopy;
            dummy.select();
            document.execCommand("copy");
            document.body.removeChild(dummy);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'OK';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 1000);
        };
        return copyBtn;
    }

    // Core Logic for Dirty State: Red Text, Show Original, Click to Reset
    _handleDirtyState(labelSpan, currentValue, originalValue, onReset) {
        if (originalValue === undefined) return;
        let isDirty = false;
        let displayOrig = originalValue;

        if (typeof currentValue === 'number' && typeof originalValue === 'number') {
            isDirty = Math.abs(currentValue - originalValue) > 0.0001;
            displayOrig = originalValue.toFixed ? originalValue.toFixed(2) : originalValue;
        } else if (typeof currentValue === 'boolean') {
            isDirty = currentValue !== originalValue;
            displayOrig = originalValue;
        } else if (typeof currentValue === 'string') {
            isDirty = currentValue !== originalValue;
        }

        if (isDirty) {
            labelSpan.style.color = 'red';
            labelSpan.style.cursor = 'pointer';
            labelSpan.title = 'Click to RESET this value';

            if (!labelSpan.querySelector('.orig-val')) {
                const origInfo = document.createElement('span');
                origInfo.className = 'orig-val';
                Object.assign(origInfo.style, {
                    fontSize: '9px',
                    color: '#ff8888',
                    marginLeft: '4px',
                    fontWeight: 'normal'
                });
                origInfo.textContent = `(Orig: ${displayOrig})`;
                labelSpan.appendChild(origInfo);
            }

            labelSpan.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onReset();
            };
        } else {
            labelSpan.style.color = 'black';
            labelSpan.style.cursor = 'default';
            labelSpan.title = '';
            labelSpan.onclick = null;
            const origInfo = labelSpan.querySelector('.orig-val');
            if (origInfo) origInfo.remove();
        }
    }

    _createEditRow(label, vector, onChange, originalVector = null, defaultStep = 0.1) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.width = '110px';
        row.appendChild(labelSpan);

        const inputBox = document.createElement('div');
        inputBox.style.display = 'flex';
        inputBox.style.gap = '8px';

        const inputs = {};

        const checkDirty = () => {
            if (!originalVector) return;
            const EPSILON = 0.001;
            const isDirty = (
                Math.abs(vector.x - originalVector.x) > EPSILON ||
                Math.abs(vector.y - originalVector.y) > EPSILON ||
                Math.abs(vector.z - originalVector.z) > EPSILON
            );
            // Pass simple proxies (1 vs 0) for isDirty, but handle Reset manually
            this._handleDirtyState(labelSpan, isDirty ? 1 : 0, 0, () => {
                vector.copy(originalVector);
                ['x', 'y', 'z'].forEach(axis => {
                    if (inputs[axis]) inputs[axis].value = vector[axis].toFixed(3);
                });
                if (onChange) onChange();
                checkDirty();
            });
            // Custom vector text
            const origInfo = labelSpan.querySelector('.orig-val');
            if (isDirty && origInfo) {
                origInfo.textContent = `Orig: ${originalVector.x.toFixed(1)}, ${originalVector.y.toFixed(1)}, ${originalVector.z.toFixed(1)}`;
            }
        };

        // --- Step Input ---
        const stepInput = document.createElement('input');
        stepInput.type = 'number';
        stepInput.value = defaultStep;
        stepInput.step = 0.001;
        stepInput.title = 'Step size (Scroll to inc/dec)';
        Object.assign(stepInput.style, {
            width: '35px',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '2px 4px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            marginLeft: '4px',
            background: '#f0f0f0'
        });

        // --- Scroll Logic ---
        const handleWheel = (e, axis) => {
            e.preventDefault();
            const stepVal = parseFloat(stepInput.value) || 0.1;
            const direction = Math.sign(e.deltaY); // -1 up, 1 down
            // Increment on scroll up (negative delta), Decrement on scroll down
            const increment = direction < 0 ? stepVal : -stepVal;

            vector[axis] += increment;

            // Format for precision to avoid floating point drift
            const precision = (stepVal.toString().split('.')[1] || '').length + 2;
            vector[axis] = parseFloat(vector[axis].toFixed(precision));

            inputs[axis].value = vector[axis].toFixed(3);

            inputs[axis].dataset.isDirty = "true";
            if (onChange) onChange();
            checkDirty();
        };

        ['x', 'y', 'z'].forEach(axis => {
            const input = document.createElement('input');
            input.type = 'number';
            input.value = typeof vector[axis] === 'number' ? vector[axis].toFixed(3) : '0.000';
            input.step = 0.001; // Keep HTML step small to allow manual fine-tuning
            Object.assign(input.style, {
                width: '45px',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '2px 4px',
                border: '1px solid #ccc',
                borderRadius: '3px'
            });

            // Input Change
            input.onchange = () => {
                vector[axis] = parseFloat(input.value) || 0;
                input.value = vector[axis].toFixed(3);
                input.dataset.isDirty = "true";
                if (onChange) onChange();
                checkDirty();
            };

            // Scroll Listener
            input.addEventListener('wheel', (e) => handleWheel(e, axis), { passive: false });

            inputs[axis] = input;
            inputBox.appendChild(input);
        });

        inputBox.appendChild(stepInput); // Add step input at end
        row.appendChild(inputBox);
        checkDirty();
        return row;
    }

    _createMaterialControl(label, type, value, onChange, options = {}, originalValue = undefined) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.width = '110px';
        row.appendChild(labelSpan);

        let inputElement, sliderElement;

        const checkDirty = (currVal) => {
            let valToCheck = currVal;
            let origToCheck = originalValue;
            if (type === 'color') {
                valToCheck = new THREE.Color(currVal).getHex();
                origToCheck = originalValue;
            }
            this._handleDirtyState(labelSpan, valToCheck, origToCheck, () => {
                if (type === 'color') {
                    const hexStr = '#' + new THREE.Color(originalValue).getHexString();
                    inputElement.value = hexStr;
                    onChange(hexStr);
                    checkDirty(hexStr);
                } else {
                    onChange(originalValue);
                    if (inputElement) inputElement.value = originalValue.toFixed(2);
                    if (sliderElement) sliderElement.value = originalValue;
                    checkDirty(originalValue);
                }
            });
            if (type === 'color' && labelSpan.querySelector('.orig-val')) {
                labelSpan.querySelector('.orig-val').textContent = `(Orig: #${new THREE.Color(originalValue).getHexString()})`;
            }
        };

        if (type === 'color') {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = '#' + value.getHexString();
            input.oninput = () => {
                onChange(input.value);
                checkDirty(input.value);
            };
            Object.assign(input.style, {
                border: 'none',
                background: 'none',
                padding: '0',
                width: '25px',
                height: '25px',
                cursor: 'pointer'
            });
            row.appendChild(input);
            inputElement = input;
            checkDirty(input.value);
        } else if (type === 'range') {
            const valueInput = document.createElement('input');
            valueInput.type = 'number';
            valueInput.value = value;
            valueInput.step = options.step ?? 0.05;
            Object.assign(valueInput.style, {
                width: '45px',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '2px 4px',
                border: '1px solid #ccc',
                borderRadius: '3px'
            });
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.max = options.max ?? 1;
            slider.min = options.min ?? (-1 * slider.max);
            slider.step = options.step ?? 0.05;
            slider.value = value;
            Object.assign(slider.style, {
                flex: '1'
            });
            const maxInput = document.createElement('input');
            maxInput.type = 'number';
            maxInput.value = slider.max;
            maxInput.step = options.step ?? 0.05;
            Object.assign(maxInput.style, {
                width: '45px',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '2px 4px',
                border: '1px solid #ccc',
                borderRadius: '3px'
            });

            // Step Input
            const stepInput = document.createElement('input');
            stepInput.type = 'number';
            stepInput.value = options.step ?? 0.05;
            stepInput.step = 0.001; // Allow fine tuning of the step itself
            stepInput.title = 'Step size';
            Object.assign(stepInput.style, {
                width: '35px',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '2px 4px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                marginLeft: '0' // Adjusted margin if needed
            });

            const handleInput = (val) => {
                const num = parseFloat(val);
                onChange(num);
                checkDirty(num);
            };
            slider.oninput = () => {
                valueInput.value = parseFloat(slider.value).toFixed(2);
                handleInput(slider.value);
            };
            valueInput.onchange = () => {
                const n = parseFloat(valueInput.value);
                if (!isNaN(n)) {
                    valueInput.value = n.toFixed(2);
                    slider.value = Math.min(Math.max(n, slider.min), slider.max);
                    handleInput(slider.value);
                }
            };
            maxInput.onchange = () => {
                const n = parseFloat(maxInput.value);
                if (!isNaN(n)) {
                    slider.max = n;
                    if (options.min === undefined) {
                        slider.min = -1 * n;
                    }

                    maxInput.value = n.toFixed(2);
                    if (parseFloat(slider.value) > n) {
                        slider.value = n;
                        valueInput.value = n.toFixed(2);
                        handleInput(n);
                    }
                }
            };
            stepInput.onchange = () => {
                const n = parseFloat(stepInput.value);
                if (!isNaN(n) && n > 0) {
                    slider.step = n;
                    valueInput.step = n;
                    maxInput.step = n;
                }
            };

            // Scroll Support for Slider and ValueInput
            const handleWheel = (e) => {
                e.preventDefault();
                const currentStep = parseFloat(slider.step) || 0.05;
                const direction = Math.sign(e.deltaY); // -1 for up, 1 for down
                // Note: Standard scroll is "up" = negative deltaY. We want "up" to increase value?
                // Usually scroll up (negative delta) means "go up", so minimize/decrement in some contexts (like page scroll up)
                // But for numeric inputs, usually scroll up => increment. Let's try decremented logic:
                // If deltaY < 0 (scrolling up), we want to ADD. If deltaY > 0 (scrolling down), we want to SUBTRACT.
                const increment = direction < 0 ? currentStep : -currentStep;

                let newValue = parseFloat(slider.value) + increment;
                newValue = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), newValue));

                // Snap to step precision
                const precision = (currentStep.toString().split('.')[1] || '').length;
                newValue = parseFloat(newValue.toFixed(precision));

                slider.value = newValue;
                valueInput.value = newValue.toFixed(2);
                handleInput(newValue);
            };

            slider.addEventListener('wheel', handleWheel, { passive: false });
            valueInput.addEventListener('wheel', handleWheel, { passive: false });

            row.appendChild(valueInput);
            row.appendChild(slider);
            row.appendChild(maxInput);
            row.appendChild(stepInput);
            inputElement = valueInput;
            sliderElement = slider;
            checkDirty(value);
        }
        return row;
    }
}