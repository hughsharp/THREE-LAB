import {
  DepthFormat, DepthTexture, LinearFilter, Matrix4, MeshStandardMaterial,
  PerspectiveCamera, Plane, UnsignedShortType, Vector3, Vector4, WebGLRenderTarget, Vector2, Color
} from "three"

export default class MeshReflectorMaterial extends MeshStandardMaterial {
  constructor(renderer, camera, scene, object, {
    mixStrength = 1,
    resolution = 256,
    mirror = 0,
    distortion = 1,
    mixContrast = 1,
    distortionMap,
    reflectorOffset = 0,
    planeNormal = new Vector3(0, 0, 1),
    depthBlur = false,
    depthBlurMin = 0.0,
    depthBlurMax = 1.0,
    depthBlurBias = 0.0,
    blurKernelSize = 3,
    // --- NEW FALLOFF PARAMETER ---
    depthBlurFalloff = 1.0, // Controls the curve of the blur transition
    enableHelper = false
  } = {}) {
    super();

    this.gl = renderer;
    this.camera = camera;
    this.scene = scene;
    this.parent = object;

    this.hasBlur = depthBlur;
    this.reflectorPlane = new Plane();
    this.normal = new Vector3();
    this.reflectorWorldPosition = new Vector3();
    this.cameraWorldPosition = new Vector3();
    this.rotationMatrix = new Matrix4();
    this.lookAtPosition = new Vector3(0, -1, 0);
    this.clipPlane = new Vector4();
    this.view = new Vector3();
    this.target = new Vector3();
    this.q = new Vector4();
    this.textureMatrix = new Matrix4();
    this.virtualCamera = new PerspectiveCamera();
    this.reflectorOffset = reflectorOffset;
    this.planeNormal = planeNormal;

    this.setupBuffers(resolution);

    this.tDiffuseSize = new Vector2(resolution, resolution);

    this.reflectorProps = {
      mirror,
      textureMatrix: this.textureMatrix,
      tDiffuse: this.fbo1.texture,
      tDepth: this.fbo1.depthTexture,
      hasBlur: this.hasBlur,
      mixStrength,
      distortion,
      distortionMap,
      mixContrast,
      tDiffuseSize: this.tDiffuseSize,
      cameraNear: camera.near,
      cameraFar: camera.far,
      depthBlur,
      depthBlurMin,
      depthBlurMax,
      depthBlurBias,
      blurKernelSize,
      depthBlurFalloff, // Pass the new property
      'defines-USE_BLUR': this.hasBlur ? '' : undefined,
      'defines-USE_DEPTH': depthBlur ? '' : undefined,
      'defines-USE_DISTORTION': distortionMap ? '' : undefined,
    };

    if (enableHelper) {
      this._createHelperUI();
    }
  }

  _createHelperUI() {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed', right: '10px', bottom: '10px', background: 'white', color: 'black',
      padding: '0', borderRadius: '5px', fontFamily: 'monospace', fontSize: '11px', zIndex: '1001',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'block', minWidth: '280px', userSelect: 'none'
    });
    const head = document.createElement('div');
    Object.assign(head.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold',
      textTransform: 'uppercase', background: '#eee', padding: '6px 10px', borderRadius: '5px 5px 0 0',
      cursor: 'move', letterSpacing: '1px'
    });
    const title = document.createElement('span');
    title.textContent = 'Reflector Material Helper';
    const chevron = document.createElement('span');
    chevron.innerHTML = '&#x25BC;';
    head.appendChild(title);
    head.appendChild(chevron);
    const body = document.createElement('div');
    Object.assign(body.style, { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' });
    const _createControlRow = (label, type, target, prop, options = {}) => {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'grid', gridTemplateColumns: '120px 1fr 40px', alignItems: 'center', gap: '8px' });
      const labelSpan = document.createElement('span');
      labelSpan.textContent = label;
      row.appendChild(labelSpan);
      let input, valueSpan;
      if (type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = target[prop];
        input.oninput = () => { target[prop] = input.checked; };
        row.appendChild(input);
      } else if (type === 'color') {
        input = document.createElement('input');
        input.type = 'color';
        input.value = '#' + target[prop].getHexString();
        input.oninput = () => { target[prop].set(input.value); };
        row.appendChild(input);
      } else {
        input = document.createElement('input');
        input.type = 'range';
        input.min = options.min ?? 0;
        input.max = options.max ?? 1;
        input.step = options.step ?? 0.01;
        input.value = target[prop];
        valueSpan = document.createElement('span');
        valueSpan.textContent = parseFloat(input.value).toFixed(2);
        input.oninput = () => {
          target[prop] = parseFloat(input.value);
          valueSpan.textContent = parseFloat(input.value).toFixed(2);
        };
        row.appendChild(input);
        row.appendChild(valueSpan);
      }
      return row;
    };
    body.appendChild(_createControlRow('Base Color', 'color', this, 'color'));
    body.appendChild(_createControlRow('Mirror', 'range', this.reflectorProps, 'mirror', { max: 1 }));
    body.appendChild(_createControlRow('Mix Strength', 'range', this.reflectorProps, 'mixStrength', { max: 5 }));
    body.appendChild(_createControlRow('Mix Contrast', 'range', this.reflectorProps, 'mixContrast', { max: 2 }));
    body.appendChild(_createControlRow('Distortion', 'range', this.reflectorProps, 'distortion', { max: 100 }));
    const separator = document.createElement('hr');
    separator.style.border = 'none'; separator.style.borderTop = '1px solid #eee'; separator.style.margin = '4px 0';
    body.appendChild(separator);
    body.appendChild(_createControlRow('Depth Blur', 'checkbox', this.reflectorProps, 'depthBlur'));
    body.appendChild(_createControlRow('Kernel Size', 'range', this.reflectorProps, 'blurKernelSize', { min: 0, max: 20, step: 1 }));
    // --- CORRECTED RANGES AND NEW FALLOFF SLIDER ---
    body.appendChild(_createControlRow('Depth Min', 'range', this.reflectorProps, 'depthBlurMin', { max: 100 }));
    body.appendChild(_createControlRow('Depth Max', 'range', this.reflectorProps, 'depthBlurMax', { max: 100 }));
    body.appendChild(_createControlRow('Falloff', 'range', this.reflectorProps, 'depthBlurFalloff', { min: 0.1, max: 100, step: 0.1 }));
    body.appendChild(_createControlRow('Bias', 'range', this.reflectorProps, 'depthBlurBias', { max: 100 }));
    panel.appendChild(head);
    panel.appendChild(body);
    document.body.appendChild(panel);
    let isDragging = false, dragMoved = false, dragOffsetX = 0, dragOffsetY = 0;
    head.onmousedown = (e) => {
        isDragging = true; dragMoved = false; const rect = panel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left; dragOffsetY = e.clientY - rect.top;
        Object.assign(panel.style, { position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`, right: '', bottom: '' });
        document.body.style.userSelect = 'none';
    };
    document.onmousemove = (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - dragOffsetX}px`;
        panel.style.top = `${e.clientY - dragOffsetY}px`;
        dragMoved = true;
    };
    document.onmouseup = () => {
        if (isDragging) { setTimeout(() => { dragMoved = false; }, 0); isDragging = false; document.body.style.userSelect = ''; }
    };
    let collapsed = false;
    head.onclick = (e) => {
        if (e.target !== head && e.target !== title && e.target !== chevron) return;
        if (dragMoved) return;
        collapsed = !collapsed;
        body.style.display = collapsed ? 'none' : 'block';
        chevron.innerHTML = collapsed ? '&#x25B2;' : '&#x25BC;';
    };
  }

  setupBuffers(resolution) {
    const parameters = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      encoding: this.gl.outputEncoding,
    };
    const fbo1 = new WebGLRenderTarget(resolution, resolution, parameters);
    fbo1.depthBuffer = true;
    fbo1.depthTexture = new DepthTexture(resolution, resolution);
    fbo1.depthTexture.format = DepthFormat;
    fbo1.depthTexture.type = UnsignedShortType;
    if (this.gl.capabilities.isWebGL2) {
      fbo1.samples = 8;
    }
    this.fbo1 = fbo1;
  }

  beforeRender() {
    if (!this.parent) return;
    this.reflectorWorldPosition.setFromMatrixPosition(this.parent.matrixWorld);
    this.cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld);
    this.rotationMatrix.extractRotation(this.parent.matrixWorld);
    this.normal.copy(this.planeNormal);
    this.normal.applyMatrix4(this.rotationMatrix);
    this.reflectorWorldPosition.addScaledVector(this.normal, this.reflectorOffset);
    this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition);
    if (this.view.dot(this.normal) > 0) return;
    this.view.reflect(this.normal).negate();
    this.view.add(this.reflectorWorldPosition);
    this.rotationMatrix.extractRotation(this.camera.matrixWorld);
    this.lookAtPosition.set(0, 0, -1);
    this.lookAtPosition.applyMatrix4(this.rotationMatrix);
    this.lookAtPosition.add(this.cameraWorldPosition);
    this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition);
    this.target.reflect(this.normal).negate();
    this.target.add(this.reflectorWorldPosition);
    this.virtualCamera.position.copy(this.view);
    this.virtualCamera.up.set(0, 1, 0);
    this.virtualCamera.up.applyMatrix4(this.rotationMatrix);
    this.virtualCamera.up.reflect(this.normal);
    this.virtualCamera.lookAt(this.target);
    this.virtualCamera.far = this.camera.far;
    this.virtualCamera.near = this.camera.near;
    this.virtualCamera.projectionMatrix.copy(this.camera.projectionMatrix);
    this.virtualCamera.updateMatrixWorld();
    this.textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
    this.textureMatrix.multiply(this.virtualCamera.projectionMatrix);
    this.textureMatrix.multiply(this.virtualCamera.matrixWorldInverse);
    this.textureMatrix.multiply(this.parent.matrixWorld);
    this.reflectorPlane.setFromNormalAndCoplanarPoint(this.normal, this.reflectorWorldPosition);
    this.reflectorPlane.applyMatrix4(this.virtualCamera.matrixWorldInverse);
    this.clipPlane.set(this.reflectorPlane.normal.x, this.reflectorPlane.normal.y, this.reflectorPlane.normal.z, this.reflectorPlane.constant);
    const projectionMatrix = this.virtualCamera.projectionMatrix;
    this.q.x = (Math.sign(this.clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    this.q.y = (Math.sign(this.clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    this.q.z = -1.0;
    this.q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
    this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(this.q));
    projectionMatrix.elements[2] = this.clipPlane.x;
    projectionMatrix.elements[6] = this.clipPlane.y;
    projectionMatrix.elements[10] = this.clipPlane.z + 1.0;
    projectionMatrix.elements[14] = this.clipPlane.w;
  }

  update() {
    if (this.parent.material !== this) return;
    this.parent.visible = false;
    const currentXrEnabled = this.gl.xr.enabled;
    const currentShadowAutoUpdate = this.gl.shadowMap.autoUpdate;
    this.beforeRender();
    this.gl.xr.enabled = false;
    this.gl.shadowMap.autoUpdate = false;
    this.gl.setRenderTarget(this.fbo1);
    this.gl.state.buffers.depth.setMask(true);
    if (!this.gl.autoClear) this.gl.clear();
    this.gl.render(this.scene, this.virtualCamera);
    this.gl.xr.enabled = currentXrEnabled;
    this.gl.shadowMap.autoUpdate = currentShadowAutoUpdate;
    this.parent.visible = true;
    this.gl.setRenderTarget(null);
  }

  onBeforeCompile(shader) {
    super.onBeforeCompile(shader);
    if (this.defines === undefined) this.defines = {};
    if (!this.defines.USE_UV) this.defines.USE_UV = '';
    if (this.reflectorProps["defines-USE_BLUR"] !== undefined) this.defines.USE_BLUR = "";
    if (this.reflectorProps["defines-USE_DEPTH"] !== undefined) this.defines.USE_DEPTH = "";
    if (this.reflectorProps["defines-USE_DISTORTION"] !== undefined) this.defines.USE_DISTORTION = "";
    
    let props = this.reflectorProps;
    for (let prop in props) {
      shader.uniforms[prop] = { get value() { return props[prop] } };
    }
    
    shader.vertexShader = `
            uniform mat4 textureMatrix;
            varying vec4 my_vUv;     
          ${shader.vertexShader}`;
          
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
          #include <project_vertex>
          my_vUv = textureMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          `
    );
    
    shader.fragmentShader = `
            uniform sampler2D tDiffuse;
            uniform sampler2D tDepth;
            uniform sampler2D distortionMap;
            uniform float distortion;
            uniform float mixStrength;
            uniform float mixContrast;
            uniform float mirror;
            uniform vec2 tDiffuseSize;
            uniform float cameraNear;
            uniform float cameraFar;
            uniform bool depthBlur;
            uniform float depthBlurMin;
            uniform float depthBlurMax;
            uniform float depthBlurBias;
            uniform float blurKernelSize;
            uniform float depthBlurFalloff; // New uniform
            varying vec4 my_vUv;
            
            float linearize_depth(float d, float near, float far) {
                return (2.0 * near) / (far + near - d * (far - near));
            }

            ${shader.fragmentShader}`;
            
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
          #include <emissivemap_fragment>
          float distortionFactor = 0.0;
          #ifdef USE_DISTORTION
            distortionFactor = texture2D(distortionMap, vUv).r * distortion;
          #endif
          vec4 new_vUv = my_vUv;
          new_vUv.x += distortionFactor;
          new_vUv.y += distortionFactor;
          vec4 base = texture2DProj(tDiffuse, new_vUv);
          vec4 merge = base;
          #ifdef USE_BLUR
            float blurRadius = 0.0;
            #ifdef USE_DEPTH
              vec4 depth = texture2DProj(tDepth, new_vUv);
              float rawDepth = depth.r;
              float linearDepth = linearize_depth(rawDepth, cameraNear, cameraFar);

              // --- FINAL CORRECTED LOGIC WITH FALLOFF ---
              // Remap the 0-1 linear depth to a 0-1 value based on our min/max settings
              float remappedDepth = smoothstep(depthBlurMin, depthBlurMax, linearDepth);
              
              // Apply the falloff curve to the remapped depth
              remappedDepth = pow(remappedDepth, depthBlurFalloff);

              blurRadius = remappedDepth + depthBlurBias;
              blurRadius *= blurKernelSize;
            #endif
            if (blurRadius > 0.0) {
              vec2 texelSize = 1.0 / tDiffuseSize;
              vec3 blurredColor = vec3(0.0);
              for (int i = -1; i <= 1; i++) {
                for (int j = -1; j <= 1; j++) {
                  vec2 offset = vec2(float(i), float(j)) * texelSize * blurRadius;
                  blurredColor += texture2DProj(tDiffuse, vec4(new_vUv.xy + offset, new_vUv.z, new_vUv.w)).rgb;
                }
              }
              merge = vec4(blurredColor / 9.0, base.a);
            }
          #endif
          vec4 newMerge = vec4(0.0, 0.0, 0.0, 1.0);
          newMerge.r = (merge.r - 0.5) * mixContrast + 0.5;
          newMerge.g = (merge.g - 0.5) * mixContrast + 0.5;
          newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;
          diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
        //   diffuseColor.rgb *= 0.5;
          `
    );
  }
}