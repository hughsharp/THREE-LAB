/**
 * FakeGlow material by Anderson Mancini - Fec 2024.
 * Integrated Helper UI by Gemini
 */
import { ShaderMaterial, Uniform, Color, AdditiveBlending, DoubleSide } from 'three';

class FakeGlowMaterial extends ShaderMaterial {

  /**
   * Create a FakeGlowMaterial.
   *
   * @param {Object} parameters - The parameters to configure the material.
   * @param {number} [parameters.falloff=0.1] - The falloff factor for the glow effect.
   * @param {number} [parameters.glowInternalRadius=6.0] - The internal radius for the glow effect.
   * @param {Color} [parameters.glowColor=new Color('#00d5ff')] - The color of the glow effect.
   * @param {number} [parameters.glowSharpness=0.5] - The sharpness of the glow effect.
   * @param {number} [parameters.opacity=1.0] - The opacity of the hologram.
   * @param {boolean} [parameters.enableHelper=false] - If true, creates a UI panel to control the material properties.
   */

  constructor(parameters = {}) {
    super();

    this.vertexShader = /*GLSL */
      `
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * modelPosition;
        vec4 modelNormal = modelMatrix * vec4(normal, 0.0);
        vPosition = modelPosition.xyz;
        vNormal = modelNormal.xyz;
      }
    `

    this.fragmentShader = /*GLSL */
      `
      uniform vec3 glowColor;
      uniform float falloff;
      uniform float glowSharpness;
      uniform float glowInternalRadius;
      uniform float opacity;

      varying vec3 vPosition;
      varying vec3 vNormal;

      void main()
      {
        // Normal
        vec3 normal = normalize(vNormal);
        if(!gl_FrontFacing)
            normal *= - 1.0;
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = dot(viewDirection, normal);
        fresnel = pow(fresnel, glowInternalRadius + 0.1);
        float falloffAmount = smoothstep(0., falloff, fresnel);
        float fakeGlow = fresnel;
        fakeGlow += fresnel * glowSharpness;
        fakeGlow *= falloffAmount;
        gl_FragColor = vec4(clamp(glowColor * fresnel, 0., 1.0), clamp(fakeGlow, 0., opacity));

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      } 
      `

    this.uniforms = {
      opacity: new Uniform(parameters.opacity !== undefined ? parameters.opacity : 1.0),
      glowInternalRadius: new Uniform(parameters.glowInternalRadius !== undefined ? parameters.glowInternalRadius : 6.0),
      glowSharpness: new Uniform(parameters.glowSharpness !== undefined ? parameters.glowSharpness : 0.5),
      falloff: new Uniform(parameters.falloff !== undefined ? parameters.falloff : 0.1),
      glowColor: new Uniform(parameters.glowColor !== undefined ? new Color(parameters.glowColor) : new Color("#00d5ff")),
    };

    this.setValues(parameters);
    this.depthTest = parameters.depthTest !== undefined ? parameters.depthTest : false;
    this.blending = parameters.blendMode !== undefined ? parameters.blendMode : AdditiveBlending;
    this.transparent = true;
    this.side = parameters.side !== undefined ? parameters.side : DoubleSide;

    if (parameters.enableHelper) {
      this._createHelperUI();
    }
  }

  _createHelperUI() {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed', right: '10px', bottom: '10px', background: 'white', color: 'black',
      padding: '0', borderRadius: '5px', fontFamily: 'monospace', fontSize: '11px', zIndex: '1001',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'block', minWidth: '300px', userSelect: 'none'
    });

    const head = document.createElement('div');
    Object.assign(head.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold',
      textTransform: 'uppercase', background: '#eee', padding: '6px 10px', borderRadius: '5px 5px 0 0',
      cursor: 'move', letterSpacing: '1px'
    });
    
    const title = document.createElement('span');
    title.textContent = 'Fake Glow Helper';
    const chevron = document.createElement('span');
    chevron.innerHTML = '&#x25BC;';
    head.appendChild(title);
    head.appendChild(chevron);

    const body = document.createElement('div');
    Object.assign(body.style, { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' });

    const _createControlRow = (label, type, uniform, options = {}) => {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'grid', gridTemplateColumns: '110px 1fr 50px', alignItems: 'center', gap: '8px' });

      const labelSpan = document.createElement('span');
      labelSpan.textContent = label;
      row.appendChild(labelSpan);

      if (type === 'color') {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = '#' + uniform.value.getHexString();
        input.style.width = '100%';
        input.oninput = () => { uniform.value.set(input.value); };
        row.appendChild(input);
      } else { // range with number input
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = options.min ?? 0;
        slider.max = options.max ?? 100;
        slider.step = options.step ?? 0.1;
        slider.value = uniform.value;
        
        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.min = options.min ?? 0;
        numberInput.max = options.max ?? 100;
        numberInput.step = options.step ?? 0.1;
        numberInput.value = uniform.value;
        Object.assign(numberInput.style, { width: '100%', padding: '2px 4px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'monospace' });

        // Sync slider to number input and uniform
        slider.oninput = () => {
          const val = parseFloat(slider.value);
          uniform.value = val;
          numberInput.value = val.toFixed(2);
        };

        // Sync number input to slider and uniform
        numberInput.onchange = () => {
          let val = parseFloat(numberInput.value);
          if (isNaN(val)) val = 0;
          val = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), val)); // Clamp value
          uniform.value = val;
          slider.value = val;
          numberInput.value = val.toFixed(2);
        };
        
        row.appendChild(slider);
        row.appendChild(numberInput);
      }
      return row;
    };
    
    body.appendChild(_createControlRow('Glow Color', 'color', this.uniforms.glowColor));
    body.appendChild(_createControlRow('Opacity', 'range', this.uniforms.opacity, { max: 1, step: 0.01 })); // Opacity is best kept 0-1
    body.appendChild(_createControlRow('Falloff', 'range', this.uniforms.falloff));
    body.appendChild(_createControlRow('Sharpness', 'range', this.uniforms.glowSharpness));
    body.appendChild(_createControlRow('Internal Radius', 'range', this.uniforms.glowInternalRadius));
    
    panel.appendChild(head);
    panel.appendChild(body);
    document.body.appendChild(panel);

    // Drag and collapse logic
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
}

export default FakeGlowMaterial;
