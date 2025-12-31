import * as THREE from 'three';

export const fresnelVertexShader = `
    uniform float mRefractionRatio;
    uniform float mFresnelBias;
    uniform float mFresnelScale;
    uniform float mFresnelPower;

    varying vec3 vReflect;
    varying vec3 vRefract[3];
    varying float vReflectionFactor;

    void main() {

        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );

        vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );

        vec3 I = worldPosition.xyz - cameraPosition;

        vReflect = reflect( I, worldNormal );
        vRefract[0] = refract( normalize( I ), worldNormal, mRefractionRatio );
        vRefract[1] = refract( normalize( I ), worldNormal, mRefractionRatio * 0.99 );
        vRefract[2] = refract( normalize( I ), worldNormal, mRefractionRatio * 0.98 );
        vReflectionFactor = mFresnelBias + mFresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), mFresnelPower );

        gl_Position = projectionMatrix * mvPosition;

    }
`;
export const fresnelFragmentShader = `
    uniform samplerCube tCube;
    uniform float uOpacity; // Declare the opacity uniform provided by Three.js

    varying vec3 vReflect;
    varying vec3 vRefract[3];
    varying float vReflectionFactor;

    void main() {

        vec4 reflectedColor = textureCube( tCube, vec3( -vReflect.x, vReflect.yz ) );
        vec4 refractedColor = vec4( 1.0 );

        refractedColor.r = textureCube( tCube, vec3( -vRefract[0].x, vRefract[0].yz ) ).r;
        refractedColor.g = textureCube( tCube, vec3( -vRefract[1].x, vRefract[1].yz ) ).g;
        refractedColor.b = textureCube( tCube, vec3( -vRefract[2].x, vRefract[2].yz ) ).b;

        // 1. Calculate the final RGB color first
        vec3 mixedColor = mix( refractedColor.rgb, reflectedColor.rgb, clamp( vReflectionFactor, 0.0, 1.0 ) );

        // 2. Construct the final output color using your calculated RGB 
        //    and the 'uOpacity' uniform for the alpha channel.
        gl_FragColor = vec4( mixedColor, uOpacity );
    }
`;
export const vertexShaderGlow = `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() 
        {
          vNormal = normalize( normalMatrix * normal ); // vNormals, the normals vectors of the object related to the world position (where it is in the global scene).
          
          vPositionNormal = normalize(( modelViewMatrix * vec4(position, 1.0) ).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`
export const fragmentShaderOuterGlow = `
        uniform vec3 glowColor;
        uniform float outerGlowBorder;
        uniform float p;
        uniform float outerGlowStrength;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() 
        {
          float a = pow( outerGlowBorder + outerGlowStrength * abs(dot(vNormal, vPositionNormal)), p );
          gl_FragColor = vec4( glowColor , a );
        }
        `
export const fragmentShaderInnerGlow = `
uniform vec3 glowColor;
uniform float glowIntensity;
uniform float glowPower;
varying vec3 vNormal;
varying vec3 vPositionNormal;

void main() 
{
    float fresnel = 1.0 - abs(dot(normalize(vNormal), normalize(vPositionNormal)));
    float a = smoothstep(0.0, 1.0, pow(fresnel, glowPower)) * glowIntensity;
    gl_FragColor = vec4( glowColor , a );
}
        `
export const vertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        varying vec3 vWorldPosition;
        void main() 
        {
          vNormal = normalize( normalMatrix * normal ); // 
          vPositionNormal = normalize(( modelViewMatrix * vec4(position, 1.0) ).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          gl_PointSize = 4.0;
          vUv = uv;

          vec4 worldPosition	= modelMatrix * vec4( position, 1.0 );
          vWorldPosition = worldPosition.xyz;

        }     
    `

export const sineVertexShader = `
        uniform float iTime;
        uniform float nebulaTwistFactor;
        #define uFrequency 5.0
        #define uAmplitude 0.2

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        varying vec3 vWorldPosition;

        void main() 
        {
            float pos = (position.x + position.z) * uFrequency;
            float waveValue = sin(pos + iTime);
            float offset = abs(waveValue) * uAmplitude;

            vec3 newPosition = position + vec3(1.0) * offset * 100.0*(0.8 + nebulaTwistFactor);

            vNormal = normalize( normalMatrix * normal ); 
            vPositionNormal = normalize(( modelViewMatrix * vec4(newPosition, 1.0) ).xyz);
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
            gl_PointSize = 4.0;
            vUv = uv;

            vec4 worldPosition = modelMatrix * vec4( newPosition, 1.0 );
            vWorldPosition = worldPosition.xyz;
        }     
    `;



export const nebulaHelixFS2 = `

uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform float nebulaCoreRadius; // scale

varying vec2 vUv;
vec2 iMouse = vec2(0.);

//SHADER HERE 
// Fork of "Supernova remnant" by Duke
// https://www.shadertoy.com/view/MdKXzc
//-------------------------------------------------------------------------------------
// Based on "Dusty nebula 4" (https://www.shadertoy.com/view/MsVXWW) 
// and "Protoplanetary disk" (https://www.shadertoy.com/view/MdtGRl) 
// otaviogood's "Alien Beacon" (https://www.shadertoy.com/view/ld2SzK)
// and Shane's "Cheap Cloud Flythrough" (https://www.shadertoy.com/view/Xsc3R4) shaders
// Some ideas came from other shaders from this wonderful site
// Press 1-2-3 to zoom in and zoom out.
// License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
//-------------------------------------------------------------------------------------


//-------------------
#define pi 3.14159265
#define R(p, a) p=cos(a)*p+sin(a)*vec2(p.y, -p.x)

// iq's noise
float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
    vec2 rg = textureLod( iChannel0, (uv+ 0.5)/256.0, 0.0 ).yx;
    return 1. - 0.82*mix( rg.x, rg.y, f.z );
}



float fbm(vec3 p)
{
//    return noise(p*.06125)*.5 + noise(p*.125)*.25 + noise(p*.25)*.125 + noise(p*.4)*.2;
// return noise(p*.06125)*.5 + noise(p*.125)*.25; //for better performance
return noise(p * 0.09f) * 0.75f; ////for better performance with minimal quality reduction
}

float length2( vec2 p )
{
    return sqrt( p.x*p.x + p.y*p.y );
}

float length8( vec2 p )
{
    p = p*p; p = p*p; p = p*p;
    return pow( p.x + p.y, 1.0/8.0 );
}


float Disk( vec3 p, vec3 t )
{
    vec2 q = vec2(length2(p.xy)-t.x,p.z*0.5);
    return max(length8(q)-t.y, abs(p.z) - t.z);
}

//==============================================================
// otaviogood's noise from https://www.shadertoy.com/view/ld2SzK
//--------------------------------------------------------------
// This spiral noise works by successively adding and rotating sin waves while increasing frequency.
// It should work the same on all computers since it's not based on a hash function like some other noises.
// It can be much faster than other noise functions if you're ok with some repetition.
const float nudge = 0.9;    // size of perpendicular vector
float normalizer = 1.0 / sqrt(1.0 + nudge*nudge);   // pythagorean theorem on that perpendicular to maintain scale
float SpiralNoiseC(vec3 p)
{
    float n = 0.0;  // noise amount
    float iter = 2.0;
    for (int i = 0; i < 8; i++)
    {
        // add sin and cos scaled inverse with the frequency
        n += -abs(sin(p.y*iter) + cos(p.x*iter)) / iter;    // abs for a ridged look
        // rotate by adding perpendicular and scaling down
        p.xy += vec2(p.y, -p.x) * nudge;
        p.xy *= normalizer;
        // rotate on other axis
        p.xz += vec2(p.z, -p.x) * nudge;
        p.xz *= normalizer;
        // increase the frequency
        iter *= 1.733733;
    }
    return n;
}

float NebulaNoise(vec3 p)
{
    float final = Disk(p.xzy,vec3(2.0,1.8,1.25));
    final += fbm(p*90.);
    final += SpiralNoiseC(p.zxy*0.5123+100.0+iTime*0.25)*3.0;

    return final;
}

float map(vec3 p) 
{
    R(p.yx, iMouse.x*0.008*pi+iTime*0.3);  //SPIN ROTATION HERE

    float NebNoise = abs(NebulaNoise(p/0.5)*0.5);
    
    return NebNoise+0.07;
}
//--------------------------------------------------------------

// assign color to the media
vec3 computeColor( float density, float radius )
{
    // color based on density alone, gives impression of occlusion within
    // the media
    //vec3 result = mix( vec3(1.0,0.9,0.8), vec3(0.4,0.15,0.1), density );
    vec3 result = mix( vec3(1.0), vec3(0.5), density );
    
    // color added to the media
    vec3 colCenter = 7.*vec3(0.8,1.0,1.0).rgb;
    vec3 colEdge = 1.5*vec3(0.48,0.53,0.5).rgb;
    result *= mix( colCenter, colEdge, min( (radius+.05)/.9, 1.15 ) );
    
    return result;
}

bool RaySphereIntersect(vec3 org, vec3 dir, out float near, out float far)
{
    float b = dot(dir, org);
    float c = dot(org, org) - 8.;
    float delta = b*b - c;
    if( delta < 0.0) 
        return false;
    float deltasqrt = sqrt(delta);
    near = -b - deltasqrt;
    far = -b + deltasqrt;
    return far > 0.0;
}

// Applies the filmic curve from John Hable's presentation
// More details at : http://filmicgames.com/archives/75
vec3 ToneMapFilmicALU(vec3 _color)
{
    _color = max(vec3(0), _color - vec3(0.004));
    _color = (_color * (6.2*_color + vec3(0.5))) / (_color * (6.2 * _color + vec3(1.7)) + vec3(0.06));
    return _color;
}

void main(  )
{  


    // ro: ray origin
    // rd: direction of the ray
    vec3 rd = normalize(vec3(-1. + 2. * vUv, 1.2));
    vec3 ro = vec3(0., 0., -6.);
    
    // ld, td: local, total density 
    // w: weighting factor
    float ld=0., td=0., w=0.;

    // t: length of the ray
    // d: distance function
    float d=1., t=0.;
    
    const float h = 0.1;
   
    vec4 sum = vec4(0.0);
   
    float min_dist=0.0, max_dist=0.0;

    if(RaySphereIntersect(ro, rd, min_dist, max_dist))
    {
       
    t = min_dist*step(t,min_dist);
   
    // raymarch loop
    for (int i=0; i<48; i++) 
    {
     
        vec3 pos = ro + t*rd;
  
        // Loop break conditions.
        if(td>0.9 || d<0.1*t || t>10. || sum.a > 0.99 || t>max_dist) break;
        
        // evaluate distance function
        float d = map(pos);
               
        // change this string to control density 
        d = max(d,0.0);
        
        // point light calculations
        vec3 ldst = vec3(0.0)-pos;
        float lDist = max(length(ldst), 0.001);

        // the color of light 
        float _T = lDist*2.3+2.6; // <-v endless tweaking
        //_T -= iTime*0.5;
        vec3 lightColor=0.4+0.5*cos(_T + pi * 0.5*vec3(-0.5,0.15,0.5)); //vec3(1.0,0.5,0.25);
        
        sum.rgb+=(vec3(0.97,0.75,1.00)/(lDist*lDist*6.)/nebulaCoreRadius); // star itself
        sum.rgb+=(lightColor/exp(lDist*lDist*lDist*.08)/30.); // bloom
        
        if (d<h) 
        {
            // compute local density 
            ld = h - d;
            
            // compute weighting factor 
            w = (1. - td) * ld;
     
            // accumulate density
            td += w + 1./200.;
        
            vec4 col = vec4( computeColor(td,lDist), td );
            
            // emission
            sum += sum.a * vec4(sum.rgb, 0.0) * 0.2;    
            
            // uniform scale density
            col.a *= 0.25;
            // colour by alpha
            col.rgb *= col.a;
            // alpha blend in contribution
            sum = sum + col*(1.0 - sum.a);  
       
        }
      
        td += 1./70.;


        
        // trying to optimize step size near the camera and near the light source
        // t += max(d * 0.1 * max(min(length(ldst),length(ro)),1.0), 0.01);
        t += max(d * 0.1 * max(min(length(ldst),length(ro)),1.0), 0.02);
        
    }
    
    // simple scattering
    sum *= 1. / exp( ld * 0.2 ) * 0.6;
        
    sum = clamp( sum, 0.0, 1.0 );
   
    sum.xyz = sum.xyz*sum.xyz*(3.0-2.0*sum.xyz);
    
    }

    gl_FragColor = vec4(sum.xyz,1.0);
   

}
`

export const nebulaHelixFS = `

uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform float nebulaCoreRadius; // scale

varying vec2 vUv;
vec2 iMouse = vec2(0.);

//SHADER HERE
// Fork of "Supernova remnant" by Duke
// https://www.shadertoy.com/view/MdKXzc
//-------------------------------------------------------------------------------------
// Based on "Dusty nebula 4" (https://www.shadertoy.com/view/MsVXWW)
// and "Protoplanetary disk" (https://www.shadertoy.com/view/MdtGRl)
// otaviogood's "Alien Beacon" (https://www.shadertoy.com/view/ld2SzK)
// and Shane's "Cheap Cloud Flythrough" (https://www.shadertoy.com/view/Xsc3R4) shaders
// Some ideas came from other shaders from this wonderful site
// Press 1-2-3 to zoom in and zoom out.
// License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
//-------------------------------------------------------------------------------------


//-------------------
#define pi 3.14159265
#define R(p, a) p=cos(a)*p+sin(a)*vec2(p.y, -p.x)

// iq's noise
float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
    vec2 rg = textureLod( iChannel0, (uv+ 0.5)/256.0, 0.0 ).yx;
    return 1. - 0.82*mix( rg.x, rg.y, f.z );
}



float fbm(vec3 p)
{
//    return noise(p*.06125)*.5 + noise(p*.125)*.25 + noise(p*.25)*.125 + noise(p*.4)*.2;
// return noise(p*.06125)*.5 + noise(p*.125)*.25; //for better performance
return noise(p * 0.09f) * 0.75f; ////for better performance with minimal quality reduction
}

float length2( vec2 p )
{
    return sqrt( p.x*p.x + p.y*p.y );
}

float length8( vec2 p )
{
    p = p*p; p = p*p; p = p*p;
    return pow( p.x + p.y, 1.0/8.0 );
}


float Disk( vec3 p, vec3 t )
{
    vec2 q = vec2(length2(p.xy)-t.x,p.z*0.5);
    return max(length8(q)-t.y, abs(p.z) - t.z);
}

//==============================================================
// otaviogood's noise from https://www.shadertoy.com/view/ld2SzK
//--------------------------------------------------------------
// This spiral noise works by successively adding and rotating sin waves while increasing frequency.
// It should work the same on all computers since it's not based on a hash function like some other noises.
// It can be much faster than other noise functions if you're ok with some repetition.
const float nudge = 0.9;    // size of perpendicular vector
float normalizer = 1.0 / sqrt(1.0 + nudge*nudge);   // pythagorean theorem on that perpendicular to maintain scale
float SpiralNoiseC(vec3 p)
{
    float n = 0.0;  // noise amount
    float iter = 2.0;
    for (int i = 0; i < 4; i++)
    {
        // add sin and cos scaled inverse with the frequency
        n += -abs(sin(p.y*iter) + cos(p.x*iter)) / iter;    // abs for a ridged look
        // rotate by adding perpendicular and scaling down
        p.xy += vec2(p.y, -p.x) * nudge;
        p.xy *= normalizer;
        // rotate on other axis
        p.xz += vec2(p.z, -p.x) * nudge;
        p.xz *= normalizer;
        // increase the frequency
        iter *= 1.733733;
    }
    return n;
}

float NebulaNoise(vec3 p)
{
    float final = Disk(p.xzy,vec3(2.0,1.8,1.25));
    final += fbm(p*90.);
    final += SpiralNoiseC(p.zxy*0.5123+100.0+iTime*0.25)*3.0;

    return final;
}

float map(vec3 p)
{
    R(p.yx, iMouse.x*0.008*pi+iTime*0.3);  //SPIN ROTATION HERE

    float NebNoise = abs(NebulaNoise(p/0.5)*0.5);

    return NebNoise+0.07;
}
//--------------------------------------------------------------

// assign color to the media
vec3 computeColor( float density, float radius )
{
    // color based on density alone, gives impression of occlusion within
    // the media
    // CHANGE: Use dark blue/purple tones for density
    vec3 result = mix( vec3(0.0, 0.05, 0.2), vec3(0.02, 0.02, 0.1), density );

    // color added to the media
    // CHANGE: Center color is now bright, cold cyan-blue
    vec3 colCenter = 7.*vec3(0.3,0.6,1.0).rgb;
    // CHANGE: Edge color is deep indigo/purple
    vec3 colEdge = 1.5*vec3(0.1,0.0,0.3).rgb;
    result *= mix( colCenter, colEdge, min( (radius+.05)/.9, 1.15 ) );

    return result;
}

bool RaySphereIntersect(vec3 org, vec3 dir, out float near, out float far)
{
    float b = dot(dir, org);
    float c = dot(org, org) - 8.;
    float delta = b*b - c;
    if( delta < 0.0)
        return false;
    float deltasqrt = sqrt(delta);
    near = -b - deltasqrt;
    far = -b + deltasqrt;
    return far > 0.0;
}

// Applies the filmic curve from John Hable's presentation
// More details at : http://filmicgames.com/archives/75
vec3 ToneMapFilmicALU(vec3 _color)
{
    _color = max(vec3(0), _color - vec3(0.004));
    _color = (_color * (6.2*_color + vec3(0.5))) / (_color * (6.2 * _color + vec3(1.7)) + vec3(0.06));
    return _color;
}

void main(  )
{


    // ro: ray origin
    // rd: direction of the ray
    vec3 rd = normalize(vec3(-1. + 2. * vUv, 1.2));
    vec3 ro = vec3(0., 0., -6.);

    // ld, td: local, total density
    // w: weighting factor
    float ld=0., td=0., w=0.;

    // t: length of the ray
    // d: distance function
    float d=1., t=0.;

    const float h = 0.1;

    vec4 sum = vec4(0.0);

    float min_dist=0.0, max_dist=0.0;

    if(RaySphereIntersect(ro, rd, min_dist, max_dist))
    {

    t = min_dist*step(t,min_dist);

    // raymarch loop
    for (int i=0; i<64; i++)
    {

        vec3 pos = ro + t*rd;

        // Loop break conditions.
        if(td>0.9 || d<0.1*t || t>10. || sum.a > 0.99 || t>max_dist) break;

        // evaluate distance function
        float d = map(pos);

        // change this string to control density
        d = max(d,0.0);

        // point light calculations
        vec3 ldst = vec3(0.0)-pos;
        float lDist = max(length(ldst), 0.001);

        // the color of light
        float _T = lDist*2.3+2.6; // <-v endless tweaking
        //_T -= iTime*0.5;
        // CHANGE: Light color oscillates between cold blue and purple tones
        vec3 lightColor=0.4+0.5*cos(_T + pi * 0.5*vec3(0.6,0.8,1.0)); 

        // CHANGE: Central star color is now a cold, bright blue-white
        sum.rgb+=(vec3(0.7, 0.85, 1.0)/(lDist*lDist*6.)/nebulaCoreRadius); // star itself
        sum.rgb+=(lightColor/exp(lDist*lDist*lDist*.08)/30.); // bloom

        if (d<h)
        {
            // compute local density
            ld = h - d;

            // compute weighting factor
            w = (1. - td) * ld;

            // accumulate density
            td += w + 1./200.;

            vec4 col = vec4( computeColor(td,lDist), td );

            // emission
            sum += sum.a * vec4(sum.rgb, 0.0) * 0.2;

            // uniform scale density
            col.a *= 0.25;
            // colour by alpha
            col.rgb *= col.a;
            // alpha blend in contribution
            sum = sum + col*(1.0 - sum.a);

        }

        td += 1./70.;



        // trying to optimize step size near the camera and near the light source
        // t += max(d * 0.1 * max(min(length(ldst),length(ro)),1.0), 0.01);
        t += max(d * 0.1 * max(min(length(ldst),length(ro)),1.0), 0.02);

    }

    // simple scattering
    sum *= 1. / exp( ld * 0.2 ) * 0.6;

    sum = clamp( sum, 0.0, 1.0 );

    sum.xyz = sum.xyz*sum.xyz*(3.0-2.0*sum.xyz);

    }

    gl_FragColor = vec4(sum.xyz,1.0);


}
`


export const stormFS = `
  uniform float iTime;
  uniform bool isStriking;
  uniform vec2 normalizedStrikePos;
  
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform float uRainHeaviness;
  uniform float uStormSharpness;
  
  // --- MOON UNIFORMS ---
  uniform vec2 uMoonPosition;
  uniform float uMoonSize;
  uniform float uMoonBrightness;
  uniform float uMoonBlur;
  uniform float uCraterScale;
  uniform float uCraterIntensity;
  uniform float uFarMountainOffset;
  uniform float uNearMountainOffset;
  uniform vec2 iResolution;

  // --- NOISE & RANDOM FUNCTIONS ---
  float rand(float x) {
      return fract(sin(x)*75154.32912);
  }

  vec2 rand2(vec2 p) {
      return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
  }

  float rand3d(vec3 x) {
      return fract(375.10297 * sin(dot(x, vec3(103.0139,227.0595,31.05914))));
  }

  float noise(float x) {
      float i = floor(x);
      float a = rand(i), b = rand(i+1.);
      float f = x - i;
      return mix(a,b,f);
  }

  float perlin(float x) {
      float r=0.,s=1.,w=1.;
      for (int i=0; i<3; i++) {
          s *= 2.0;
          w *= 0.5;
          r += w * noise(s*x);
      }
      return r;
  }

  float noise3d(vec3 x) {
      vec3 i = floor(x);
      float i000 = rand3d(i+vec3(0.,0.,0.)), i001 = rand3d(i+vec3(0.,0.,1.));
      float i010 = rand3d(i+vec3(0.,1.,0.)), i011 = rand3d(i+vec3(0.,1.,1.));
      float i100 = rand3d(i+vec3(1.,0.,0.)), i101 = rand3d(i+vec3(1.,0.,1.));
      float i110 = rand3d(i+vec3(1.,1.,0.)), i111 = rand3d(i+vec3(1.,1.,1.));
      vec3 f = x - i;
      return mix(mix(mix(i000,i001,f.z), mix(i010,i011,f.z), f.y),
                 mix(mix(i100,i101,f.z), mix(i110,i111,f.z), f.y), f.x);
  }

  float perlin3d(vec3 x) {
      float r = 0.0;
      float w = 1.0, s = 1.0;
      for (int i=0; i<2; i++) {
          w *= 0.5;
          s *= 2.0;
          r += w * noise3d(s * x);
      }
      return r;
  }

  // Helper to generate 2D-like noise using 3D perlin (slice at z=0.5)
  float moonSurfaceNoise(vec2 uv, float scale) {
      return perlin3d(vec3(uv * scale, 0.5));
  }

  // --- OBJECT/EFFECT FUNCTIONS ---

  float f(float y) {
      float w = 0.25; 
      float primary_path = perlin(2.0 * y);
      float forking_detail = perlin(20.0 * y) * 0.1; 
      return w * (primary_path + forking_detail - 0.5);
  }

  float plot(vec2 p, float d, bool thicker) {
      if (thicker) d += 2. * abs(f(p.y + 0.001) - f(p.y));
      return smoothstep(d, 0., abs(f(p.y) - p.x));
  }

  float cloud(vec2 uv, float speed, float scale, float cover) {
      float c = perlin3d(vec3(uv * scale, iTime * speed * 2.));
      return max(0., c - (1. - cover));
  }

  float mountain(vec2 uv, float scale, float offset, float h1, float h2) {
      float h = h1 + perlin(scale*uv.x + offset) * (h2 - h1);
      return smoothstep(h, h+0.01, uv.y);
  }

  float rain_layer(vec2 uv, float time_mult, vec2 density, float slant, float streak_length) {
      float time = iTime * time_mult;
      vec2 motion = vec2(slant, 1.0);
      vec2 uv_moved = uv + motion * time;

      vec2 grid_id = floor(uv_moved * density);
      float random_val = rand(grid_id.x + grid_id.y * 19.19);

      vec2 grid_uv = fract(uv_moved * density);

      float drop_y = fract(grid_uv.y + random_val);
      float drop_x = rand(grid_id.y + grid_id.x * 29.29);
      float dist_x = abs(grid_uv.x - drop_x);

      float line = smoothstep(0.04, 0.0, dist_x);
      float streak = line * smoothstep(streak_length, 0.0, drop_y);

      return streak;
  }
      
  float getWhiteCoreWidth(float x) {  
    const float MIN_WIDTH = 0.0003;
        const float MAX_WIDTH = 0.0015;
        const float CONSTANT_END_POINT = 0.37;
        const float DECAY_RATE_K = 15000.0;

        if (x <= CONSTANT_END_POINT) {
            return MAX_WIDTH;
        }

        const float DECAY_RANGE = MAX_WIDTH - MIN_WIDTH;
        float distance = x - CONSTANT_END_POINT;
        float decayFactor = exp(-DECAY_RATE_K * distance);

        return MIN_WIDTH + DECAY_RANGE * decayFactor;
  }

  // --- RENDER FUNCTION ---
  vec3 render(vec2 uv) {
      uv.x += 0.12; // Offset scene to the left (adjusted from 0.2 per user request)
      vec3 lightning = vec3(0.0);
      float light = 0.;

      // --- LIGHTNING LOGIC ---
      if (isStriking) {
          float i = floor(iTime * 10.0);
          vec2 uv2 = uv;
          uv2.y += i * 2.;
          
          // Input normalizedStrikePos.x is ALREADY in -1..1 range (calculated in JS as 2*localPoint)
          // So we just need to add the scene offset (0.12) to match uv2.x
          float p = normalizedStrikePos.x + 0.12; 
          uv2.x -= p;
          
          float whiteCoreWidth = getWhiteCoreWidth(normalizedStrikePos.y);
          float strike = plot(uv2, whiteCoreWidth, false) * 2.0;
          float glow = plot(uv2, 0.04, false) * 0.2;

          vec3 strike_color = vec3(1.0, 1.0, 1.0);
          vec3 glow_color = vec3(0.3, 0.5, 1.0);

          vec3 colored_lightning = strike_color * strike + glow_color * glow;
          
          float h = normalizedStrikePos.y;
          colored_lightning *= smoothstep(h, h+0.05, uv.y + perlin(1.2*uv.x + 4.*h)*0.03);
          
          light = smoothstep(6., 0., abs(uv.x - p)) * 1.5;
          lightning = colored_lightning;
      }

      vec3 sky = vec3(0.02, 0.04, 0.12); // darker night sky for better contrast



      // ==========================================
      // === REALISTIC PROCEDURAL MOON RENDERING ===
      // ==========================================

      vec2 moonPos = -1.0 + 2.0 * uMoonPosition;
      
      // --- CORRECTING DISTORTION (Ray-Sphere Intersection) ---
      // We derive the Moon's 3D direction from its 2D position on the Sky Plane without using simple 2D distance.
      // This ensures it looks like a perfect sphere regardless of camera angle.
      
      vec3 viewDir = normalize(vWorldPosition - cameraPosition);
      
      // Sky Plane Parameters (approximate)
      vec3 planeCenter = vec3(-55.0, -20.0, 30.0);
      float planeScale = 150.0;
      
      // Calculate World Position of the Moon center based on UVs
      vec3 moonWorldPos = planeCenter + vec3((uMoonPosition.x - 0.5) * planeScale, (uMoonPosition.y - 0.5) * planeScale, 0.0);
      vec3 moonDir = normalize(moonWorldPos - cameraPosition);
      
      // Use Angular Distance (Perfect Circle)
      float moonDot = dot(viewDir, moonDir);
      float moonAngle = acos(clamp(moonDot, -1.0, 1.0));
      
      // Adjusted scale to match previous "beautiful" look preference
      // The user tuned uMoonSize for the 2D version (factor 4.0).
      // We keep this factor for the Radius calculation to maintain relative visual size logic.
      float moonRadiusRad = uMoonSize * 4.0; 

      // 3. Moon Body Mask
      float moonBody = smoothstep(moonRadiusRad, moonRadiusRad - uMoonBlur, moonAngle);

      vec3 finalMoonLayer = vec3(0.0);
      
      if (moonBody > 0.001) {
          // 4. Billboard Projection for Texture
          vec3 moonRight = normalize(cross(vec3(0.0, 1.0, 0.0), moonDir));
          vec3 moonUp = normalize(cross(moonDir, moonRight));
          
          vec2 localUV = vec2(dot(viewDir, moonRight), dot(viewDir, moonUp));
          
          // Restore Linear UV Mapping (dividing by radius directly)
          // This restores the "Zoom" level of the craters to what the user liked.
          vec2 moonUV = localUV / moonRadiusRad;
          
          float distSq = dot(moonUV, moonUV);
          
          if (distSq < 1.0) {
              // 5. Procedural Textures
              // Layer A: Maria (Seas)
              float mariaNoise = moonSurfaceNoise(moonUV, 2.5); 
              float maria = smoothstep(0.3, 0.8, mariaNoise); 

              // Layer B: Craters
              float craterNoise = moonSurfaceNoise(moonUV, uCraterScale);
              float craterShape = smoothstep(0.45, 0.55, craterNoise); 
              
              // Combine Textures
              float surfaceBrightness = 1.0;
              surfaceBrightness -= maria * 0.3; 
              surfaceBrightness *= mix(1.0, 0.4, craterShape * uCraterIntensity);

              // 6. Color & Lighting
              vec3 icyBlueTint = vec3(0.75, 0.9, 1.0);
              
              // Soft spherical, but mostly flat to keep detail visible
              float sphereShade = sqrt(1.0 - distSq);
              surfaceBrightness *= (0.9 + 0.1 * sphereShade);

              // Boosted brightness multiplier for the moon body per user request
              vec3 moonColor = icyBlueTint * uMoonBrightness * surfaceBrightness * 2.5;

              finalMoonLayer = moonColor * moonBody;
          }
      }

      // 7. Moon Aura (Glow)
      // Exponential decay starting exactly at the edge
      float distFromEdge = max(0.0, moonAngle - moonRadiusRad);
      // Slower decay for a larger, clearer glow (was -20.0)
      float glowDecay = exp(-12.0 * distFromEdge); 
      
      // Mask: strictly 0 inside the moon (distFromEdge is 0, but we want to be sure)
      // effectively, aura adds on top of the background, but should not wash out the moon body.
      // We use a smoothstep mask slightly outside the radius to blend it clean.
      float auraMask = smoothstep(moonRadiusRad - uMoonBlur, moonRadiusRad, moonAngle);
      
      // Reverted to clearer light blue-ish tone (less cyan, more white-blue)
      // Linear scaling with brightness but dampened factor (0.5) to scale "a little bit"
      vec3 auraColor = vec3(0.4, 0.6, 1.0) * uMoonBrightness * 0.5;
      vec3 auraLayer = auraColor * glowDecay * auraMask;

      // Composite Moon + Aura (Moved after clouds to ensure visibility)
      // sky += finalMoonLayer + auraLayer; // Originally here

      // ==========================================
      
      // Composite Moon + Aura (Before Clouds so they cover it)
      sky = finalMoonLayer + sky * (1.0 - moonBody) + auraLayer;

      // --- CLOUDS ---
      // Modified: Faster (shorter cover time) and gapier (contrast) per user request
      float c1_density = cloud(uv, 0.25, 0.1, 0.65); 
      float c2_density = cloud(uv*vec2(0.5,1.), 0.10, 0.8, 0.60);
      float c3_density = cloud(uv*vec2(0.1,1.), 0.15, 5.5, 0.55);

      vec3 cloud_base_color = vec3(0.5, 0.6, 0.7); // darker base for contrast
      vec3 cloud_highlight_color = vec3(1.0, 1.0, 1.0); // pure white highlights

      // Use the densities to mix between base and highlight
      vec3 cloud_color = mix(cloud_base_color, cloud_highlight_color, c1_density);
      
      // Add contribution from other layers
      cloud_color += (vec3(0.9) * c2_density * 0.5) + (vec3(1.0) * c3_density * 0.3);

      float total_cloud_density = c1_density + c2_density + c3_density;
      
      // Wider transition range allows for soft, partial coverage
      // But we boost the density slightly to make sure it's not too transparent
      float cloud_alpha = smoothstep(0.1, 0.9, total_cloud_density * 1.2);
      
      sky = mix(sky, cloud_color, cloud_alpha);

      // Re-add moon on top of clouds (Alpha Blend to block clouds behind it)
      // sky = finalMoonLayer + sky * (1.0 - moonBody) + auraLayer; // Moved up

      // --- MOUNTAINS ---
      // Modified: Using Uniforms for X offset
      float far_mountain_mask = mountain(uv + vec2(uFarMountainOffset, 0.0), 1.21, 9., 0.3, 0.6);
      float mid_mountain_mask = mountain(uv + vec2(uNearMountainOffset, 0.0), 1.83, 3., 0.25, 0.5);

      vec3 terrain_color_far = 1. * vec3(0.15, 0.2, 0.3);
      vec3 terrain_color_close = vec3(0.25, 0.3, 0.3) * 0.5;

      vec3 background = sky;
      background = mix(terrain_color_far, background, far_mountain_mask);
      background = mix(terrain_color_close, background, mid_mountain_mask);

      background *= (0.2 + light * 0.03);

      vec3 scene_color = background + lightning;

      // --- RAIN ---
      float density_mult = mix(100.0, 400.0, uRainHeaviness);
      vec2 rain_density = vec2(density_mult * 1.0, density_mult * 0.75);

      float rain_amount = rain_layer(uv, 1.5, rain_density, 1.0, 0.15);
      rain_amount = clamp(rain_amount, 0.0, 1.0);

      vec3 rain_color = vec3(0.7, 0.8, 1.0) * (0.74 + light * 2.0);
      
      vec3 final_color = mix(scene_color, rain_color, rain_amount * uRainHeaviness);

      return final_color;
  }

  void main() {
      vec2 uv = -1. + 2. * vUv;
      
      vec3 finalColor = render(uv);
      // uStormSharpness = 0 => all black, uStormSharpness = 1 => normal render
      finalColor *= uStormSharpness;
      
      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const rainyGlassFS = `

uniform float iTime;
uniform vec2 iResolution;
uniform float rainGlassOpacity;
uniform float glassRainAmount;
varying vec2 vUv;
vec2 iMouse = vec2(0.);

// TOGGLES & RANDOMNESS
uniform bool hasRimOnGlass; 
uniform float uRainOffset; // Allows different rain patterns per plane
uniform vec2 uRimCenter;

uniform sampler2D iChannelX;

// ==================================================
// HELPER FUNCTIONS (Noise & Math)
// ==================================================

float hash(vec2 p)  { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

#define S(a, b, t) smoothstep(a, b, t)

vec3 N13(float p) {
    vec3 p3 = fract(vec3(p) * vec3(.1031,.11369,.13787));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

vec4 N14(float t) {
    return fract(sin(t*vec4(123., 1024., 1456., 264.))*vec4(6547., 345., 8799., 1564.));
}

float N(float t) {
    return fract(sin(t*12345.564)*7658.76);
}

float Saw(float b, float t) {
    return S(0., b, t)*S(1., b, t);
}

vec2 DropLayer2(vec2 uv, float t) {
    vec2 UV = uv;
    
    uv.y += t*0.75;
    vec2 a = vec2(6., 1.);
    vec2 grid = a*2.;
    vec2 id = floor(uv*grid);
    
    float colShift = N(id.x); 
    uv.y += colShift;
    
    id = floor(uv*grid);
    vec3 n = N13(id.x*35.2+id.y*2376.1);
    vec2 st = fract(uv*grid)-vec2(.5, 0);
    
    float x = n.x-.5;
    
    float y = UV.y*20.;
    float wiggle = sin(y+sin(y));
    x += wiggle*(.5-abs(x))*(n.z-.5);
    x *= .7;
    float ti = fract(t+n.z);
    y = (Saw(.85, ti)-.5)*.9+.5;
    vec2 p = vec2(x, y);
    
    float d = length((st-p)*a.yx);
    
    float mainDrop = S(0.3, .0, d);
    
    float r = sqrt(S(1., y, st.y));
    float cd = abs(st.x-x);
    float trail = S(.23*r, .15*r*r, cd);
    float trailFront = S(-.02, .02, st.y-y);
    trail *= trailFront*r*r;
    
    y = UV.y;
    float trail2 = S(.2*r, .0, cd);
    float droplets = max(0., (sin(y*(1.-y)*120.)-st.y))*trail2*trailFront*n.z;
    y = fract(y*10.)+(st.y-.5);
    float dd = length(st-vec2(x, y));
    droplets = S(.2, 0., dd);
    float m = mainDrop+droplets*r*trailFront;
    
    return vec2(m, trail);
}

float StaticDrops(vec2 uv, float t) {
    uv *= 20.;
    
    vec2 id = floor(uv);
    uv = fract(uv)-.0;
    vec3 n = N13(id.x*107.45+id.y*3543.654);
    vec2 p = (n.xy-.5)*.7;
    float d = length(uv-p);
    
    float fade = Saw(.025, fract(t+n.z));
    float c = S(.3, 0., d)*fract(n.z*10.)*fade;
    return c;
}

vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
    float s = StaticDrops(uv, t)*l0; 
    vec2 m1 = DropLayer2(uv, t)*l1;
    vec2 m2 = DropLayer2(uv*1.85, t)*l2;
    
    float c = s+m1.x+m2.x;
    c = S(.3, 1., c);
    
    return vec2(c, max(m1.y*l0, m2.y*l1));
}

// ==================================================
// MAIN SHADER LOOP
// ==================================================

void main( )
{
    // 1. APPLY RANDOM OFFSET (Only for rain drops)
    // We create a separate UV for rain so shifting it doesn't move the dry spot.
    vec2 rainUv = vUv + vec2(uRainOffset * 20.0, uRainOffset * 10.0);

    vec2 uv = -1.+ 2. * rainUv;
    vec2 UV = rainUv; // Use randomized UV
    
    vec3 M = vec3(0.);
    float T = 100.0 + iTime+M.y*2.;
    
    float t = T * 0.16;
    // float glassRainAmount = 1.0;
    float maxBlur = mix(1.0, 30.0, glassRainAmount);
    float minBlur = 0.5;
    float zoom = 3.15;
    
    uv *= .7+zoom*.3;
    UV = (UV-.5)*(.9+zoom*.1)+.5;
    
    float staticDrops = S(-.5, 1., glassRainAmount)*0.5;
    float layer1 = S(.25, .75, glassRainAmount);
    float layer2 = S(.0, .5, glassRainAmount);
    
    // Calculate Standard Rain Drops
    vec2 c = Drops(uv, t, staticDrops, layer1, layer2);
    
    // --------------------------------------------------
    // DRY SPOT & RIM LOGIC
    // --------------------------------------------------
    
    // Default values (used if hasRimOnGlass is false)
    float rainMask = 1.0;  // 1.0 = visible rain
    float rimFactor = 0.0; // 0.0 = no rim highlight

    if (hasRimOnGlass) {
        // IMPORTANT: Use original 'vUv' here, not 'rainUv'
        // This ensures the hole stays in the center regardless of randomness
        vec2 centerPos = vUv - uRimCenter;

        // Aspect Ratio Fix (Adjust if plane dimensions change)
        float planeAspect = 0.75; 
        centerPos.x *= planeAspect; 
        
        float centerDist = length(centerPos);

        // --- SETTINGS (Scaled up 1.5x) ---
        float spotRadius = 0.075; // Size of hole
        float noiseScale = 3.5;   // Spikiness
        float noiseStrength = 0.05; // Depth of spikes
        
        float organicNoise = noise(normalize(centerPos) * noiseScale + iTime * 0.5);
        float distortedDist = centerDist + organicNoise * noiseStrength;

        float rimWidth = 0.06; // Thickness of rim
        
        rimFactor = S(spotRadius + rimWidth, spotRadius, distortedDist);
        float edgeSoftness = 0.02;
        
        // Calculate the mask (0.0 inside hole, 1.0 outside)
        rainMask = S(spotRadius, spotRadius + edgeSoftness, distortedDist);
    }
    
    // --------------------------------------------------
    // COMBINE LAYERS
    // --------------------------------------------------

    // Generate dense rim drops (Double layer technique)
    float extra1 = StaticDrops(uv + vec2(0.3, 0.25), t);
    float extra2 = StaticDrops(uv * 1.1 + vec2(0.0, 0.0), t); 
    
    // Multiply by rimFactor (will be 0.0 if hasRimOnGlass is false)
    float denseRim = (extra1 + extra2) * rimFactor * 2.0;
    
    // Add rim drops to the main drop channel
    c.x = max(c.x, denseRim); 

    // Cut the hole in the rain layer
    c *= rainMask;

    // --------------------------------------------------
    // NORMAL CALCULATION (For neighbors)
    // --------------------------------------------------
    vec2 e = vec2(.001, 0.);
    
    // Neighbor 1
    vec2 c1 = Drops(uv+e, t, staticDrops, layer1, layer2);
    float e1_1 = StaticDrops(uv+e + vec2(0.3, 0.25), t);
    float e1_2 = StaticDrops((uv+e) * 1.1 + vec2(0.0, 0.0), t);
    float r1 = (e1_1 + e1_2) * rimFactor * 2.0;
    c1.x = max(c1.x, r1);
    float cx = c1.x * rainMask;

    // Neighbor 2
    vec2 c2 = Drops(uv+e.yx, t, staticDrops, layer1, layer2);
    float e2_1 = StaticDrops(uv+e.yx + vec2(0.3, 0.25), t);
    float e2_2 = StaticDrops((uv+e.yx) * 1.1 + vec2(0.0, 0.0), t);
    float r2 = (e2_1 + e2_2) * rimFactor * 2.0;
    c2.x = max(c2.x, r2);
    float cy = c2.x * rainMask;

    vec2 n = vec2(cx-c.x, cy-c.x); 

    // --------------------------------------------------
    // FINAL COMPOSITION
    // --------------------------------------------------

    // Calculate Blur
    float focus = mix(maxBlur-c.y, minBlur, S(.1, .2, c.x));
    
    // Ensure the dry spot is crystal clear (0 blur)
    focus *= rainMask;

    // Sample the background texture
    vec3 col = textureLod(iChannelX, UV+n, focus).rgb;

    // Shading
    col *= 1.0 - c.x * 0.15; // Darken drops
    float highlight = max(0.0, normalize(n).y);
    col += pow(highlight, 20.0) * 0.5; // Add specularity

    col *= 1.0 - c.y * 0.3; // Trail visibility
    
    // Add subtle whitish highlight to the rim
    col += vec3(0.15) * rimFactor * rainMask;

    gl_FragColor = vec4(col, rainGlassOpacity);
}
`;

export const portalFragmentShader = `
  // Uniforms to be supplied by Three.js
  uniform float iTime;

  // This varying receives the UV coordinates from the vertex shader
  varying vec2 vUv;

  // --- Helper Functions from the original Shadertoy shader ---

  /**
  * Applies smooth displacement to the circumference of the circle.
  */
  float variation(vec2 v1, vec2 v2, float strength, float speed) {
    return sin(
          dot(normalize(v1), normalize(v2)) * strength + iTime * speed
      ) / 100.;
  }

  /**
  * Draws a circle with smooth variation to its circumference over time.
  */
  vec3 paintCircle (vec2 uv, vec2 center, float rad, float width, float index) {
      vec2 diff = center-uv;
      float len = length(diff);
      float scale = rad;
      float mult = mod(index, 2.) == 0. ? 1. : -1.;
      len += variation(diff, vec2(rad*mult, 1.0), 7.0*scale, 2.0);
      len -= variation(diff, vec2(1.0, rad*mult), 7.0*scale, 2.0);
      float circle = smoothstep((rad-width)*scale, (rad)*scale, len) - smoothstep((rad)*scale, (rad+width)*scale, len);
      return vec3(circle);
  }

  /**
  * A ring consists of a wider faded circle with an overlaid white solid inner circle.
  */
  vec3 paintRing(vec2 uv, vec2 center, float radius, float index){
      //paint color circle
      vec3 color = paintCircle(uv, center, radius, 0.075, index);
      //this is where the blue color is applied - change for different mood
      color *= vec3(0.3, 0.85, 1.0);
      //paint white circle
      color += paintCircle(uv, center, radius, 0.015, index);
      return color;
  }


  // The main entry point for the shader in Three.js/WebGL
  void main() {
      // MODIFIED: Use the geometry's UVs instead of screen coordinates
      vec2 uv = vUv;

      // --- Constant declarations from the original shader ---
      const float numRings = 20.;
      const vec2 center = vec2(0.5);
      const float spacing = 1. / numRings;
      const float slow = 30.;
      const float cycleDur = 1.;
      const float tunnelElongation = .25;
      const float border = 0.25;

      // --- Animated and calculated variables ---
      float radius = mod(iTime/slow, cycleDur);
      vec3 color = vec3(0.0);

      // This provides the smooth fade black border
      vec2 bl = smoothstep(0., border, uv); // bottom left
      vec2 tr = smoothstep(0., border, 1.-uv); // top right
      float edges = bl.x * bl.y * tr.x * tr.y;

      // Push in the left and right sides to make the warp square
      uv.x *= 1.5;
      uv.x -= 0.25;

      // The main loop to draw the rings
      for(float i=0.; i<numRings; i++){
        color += paintRing(uv, center, tunnelElongation*log(mod(radius + i * spacing, cycleDur)), i ); // Fast circles
        color += paintRing(uv, center, log(mod(radius + i * spacing, cycleDur)), i); // Slower circles
      }

      // Combine effects to create a black fade around the edges
      color = mix(color, vec3(0.), 1.-edges);
      color = mix(color, vec3(0.), distance(uv, center));

      // Assign the final calculated color to gl_FragColor
      gl_FragColor = vec4(color, 1.0);
  }
`;
export const hexFragmentShader = `
  // Uniforms from Three.js
  uniform vec2 iResolution;
  uniform float iTime;
  uniform vec2 iMouse;       // Mouse coordinates, normalized from [0, 1]
  uniform sampler2D iChannel0; // A texture channel

  // Varying from the vertex shader
  varying vec2 vUv;

  // --- Preprocessor Defines and Helper Functions from Shadertoy ---

  #define FLAT_TOP_HEXAGON
  #define PI 3.14159

  #ifdef FLAT_TOP_HEXAGON
    const vec2 s = vec2(sqrt(3.0), 1.0);
  #else
    const vec2 s = vec2(1.0, sqrt(3.0));
  #endif

  float Hex(in vec2 p)
  {
    p = abs(p);
    #ifdef FLAT_TOP_HEXAGON
      return max(dot(p, s * 0.5), p.y);
    #else
      return max(dot(p, s * 0.5), p.x);
    #endif
  }

  vec4 HexLattice(vec2 uv)
  {
    #ifdef FLAT_TOP_HEXAGON
      vec4 hexCenter = round(vec4(uv, uv - vec2(1.0, 0.5)) / s.xyxy);
    #else
      vec4 hexCenter = round(vec4(uv, uv - vec2(0.5, 1.0)) / s.xyxy);
    #endif
    vec4 offset = vec4(uv - hexCenter.xy * s, uv - (hexCenter.zw + 0.5) * s);
    return dot(offset.xy, offset.xy) < dot(offset.zw, offset.zw) ?
           vec4(offset.xy, hexCenter.xy) : vec4(offset.zw, hexCenter.zw + 0.5);
  }

  float rand(vec2 c){
    return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  float noise(vec2 p, float freq ){
    float unit = 1.0/freq;
    vec2 ij = floor(p/unit);
    vec2 xy = mod(p,unit)/unit;
    xy = .5*(1.-cos(PI*xy));
    float a = rand((ij+vec2(0.,0.)));
    float b = rand((ij+vec2(1.,0.)));
    float c = rand((ij+vec2(0.,1.)));
    float d = rand((ij+vec2(1.,1.)));
    float x1 = mix(a, b, xy.x);
    float x2 = mix(c, d, xy.x);
    return mix(x1, x2, xy.y);
  }

  float Glow(float sdf, float width, float power)
  {
    return pow(width / sdf, power);
  }

  // The main entry point for the shader
  void main() {
    // CORRECTED: 'iTimex' is now declared inside main()
    float iTimex = iTime * 0.1;

    // Use geometry's UVs and normalized mouse coords from uniforms
    vec2 uv = vUv;
    vec2 mouse = iMouse;

    float aspectRatio = iResolution.x / iResolution.y;

    // Tiling between range, with mouse as input.
    float tiling = mix(8.0, 32.0, mouse.x);

    vec2 hexTiling = vec2(tiling);
    
    vec2 hexUV = uv * hexTiling;
    
    // We still need to correct the mouse coordinates to match the tiling
    vec2 hexMouse = mouse * hexTiling;
    hexMouse.x *= aspectRatio;


    vec4 hexGrid = HexLattice(hexUV);
    vec4 hexGridOriginal = hexGrid;

    vec3 colour;

    #ifdef FLAT_TOP_HEXAGON
      hexGrid.z *= aspectRatio;
    #else
      hexGrid.w *= aspectRatio;
    #endif

    vec2 hexGridUV = hexGrid.zw / hexTiling;
    vec2 hexGridOriginalUV = hexGridOriginal.zw / hexTiling;

    #ifndef FLAT_TOP_HEXAGON
      hexGridUV *= vec2(1.0, 0.975);
    #endif

    colour.rg = hexGridUV.xy;
    colour.b = uv.y * (abs(sin(iTimex * 10.0)) * 5.0);

    float hex = Hex(hexGrid.xy) * 2.0;
    float scanSpeed = 1.0;
    float noiseTiling = 2.0;
    vec2 noiseAnimation = vec2(-2.0, -2.0);
    float animatedNoise = noise(hexGrid.zw + vec2(noiseAnimation * iTimex), noiseTiling);
    
    // Changed this from your code to make it flow from top to bottom
    float scanBase = - hexGridOriginalUV.x;

    scanBase += animatedNoise * 0.2;
    scanBase += sin(hexGridUV.x * 64.0) * 0.05;

    // I assume you want mouse.y for up-down control
    float scan = fract(scanBase + (iTimex * scanSpeed) + mouse.y); 

    colour *= step(smoothstep(0.0, 0.7, scan), 1.0 - hex);
    colour *= animatedNoise;

    if (hexGridOriginal.zw == HexLattice(hexMouse).zw)
    {
      vec3 glowColour = vec3(0.5, 0.1, 1.0);
      colour = Glow(hex, 0.5, 5.0) * glowColour;
    }

    vec3 textureColour = texture(iChannel0, hexGridUV).rgb;
    colour = mix(colour, textureColour, 0.3);

    gl_FragColor = vec4(colour, 1.0);
  }
`;
export const cosmicPortalFragmentShader = `
  // Uniforms from Three.js
  uniform vec2 iResolution;
  uniform float iTime;
  uniform sampler2D portalTexture; // A noise texture

  // Varying from the vertex shader
  varying vec2 vUv;

  // --- Preprocessor Defines and Helper Functions from Shadertoy ---
  #define time (iTime) * 0.12
  #define tau 6.2831853

  mat2 makem2(in float theta){float c = cos(theta);float s = sin(theta);return mat2(c,-s,s,c);}
  float noise( in vec2 x ){return texture(portalTexture, x*.01).x;}

  float fbm(in vec2 p)
  {
    float z=2.;
    float rz = 0.;
    vec2 bp = p;
    for (float i= 1.;i < 6.;i++)
    {
      rz+= abs((noise(p)-0.5)*2.)/z;
      z = z*2.;
      p = p*2.;
    }
    return rz;
  }

  float dualfbm(in vec2 p)
  {
    //get two rotated fbm calls and displace the domain
    vec2 p2 = p*.7;
    vec2 basis = vec2(fbm(p2-time*1.6),fbm(p2+time*1.7));
    basis = (basis-.5)*.2;
    p += basis;

    //coloring
    return fbm(p*makem2(time*0.2));
  }

  float circ(vec2 p)
  {
    float r = length(p);
    r = log(sqrt(r));
    return abs(mod(r*4.,tau)-3.14)*3.+.2;
  }

  // The main entry point for the shader
  void main() {
    // Setup system: Convert UVs [0,1] to [-0.5, 0.5] to center the effect.
    // This replaces the original fragCoord/iResolution calculation.
    vec2 p = vUv - 0.5;

    // We still apply the aspect ratio here to make the circular fade work correctly
    // on non-square canvases, but the core pattern is based on the undistorted vUv.
    vec2 p_aspect = p;
    p_aspect.x *= iResolution.x/iResolution.y;
    float len = length(p_aspect);

    p *= 4.0;

    float rz = dualfbm(p);
    float artifacts_radious_fade = pow(max(1.0, 6.5*len), 0.2);
    rz = artifacts_radious_fade*rz + (1.-artifacts_radious_fade)*dualfbm(p+5.0*sin(time)); // Add floating things around portal
    float my_time = time + 0.08*rz;

    //rings
    p /= exp(mod((my_time*10. + rz),3.38159)); // offset from PI to make the ripple effect at the start
    rz *= pow(abs((0.1-circ(p))),.9);

    //final color
    vec3 col = 0.4*vec3(.2 ,0.1,0.4)/rz;
    col=pow(abs(col),vec3(.99));
    gl_FragColor = vec4(col,1.0);
  }
`;
export const redGlowFragmentShader = `
  varying vec2 vUv;

  void main() {
    vec2 centeredUv = vUv - 0.5;
    float distanceFromCenter = length(centeredUv);
    float glow = 1.0 - smoothstep(0.1, 0.4, distanceFromCenter);
    vec3 glowColor = vec3(1.0, 0.0, 0.0);
    gl_FragColor = vec4(glowColor, glow);
  }
`;

const moonLightFS = `
  // Uniforms to be supplied by Three.js
  uniform vec2 iResolution;
  uniform float iTime;

  // --- MACROS from the original shader ---
  #define TAU 6.28318530718
  #define MAX_ITER 5

  // The main entry point for the shader in Three.js/WebGL
  void main() {
    // Original shader logic starts here
    float time = iTime * .125 + 23.0;
    
    // Convert pixel coordinate to UV coordinate (0.0 to 1.0)
    // Replaced Shadertoy's 'fragCoord' with GLSL's 'gl_FragCoord.xy'
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec2 p = mod(uv * TAU, TAU) - 213.0;
    vec2 i = vec2(p);
    float c = 1.0;
    float inten = .005;

    for (int n = 0; n < MAX_ITER; n++) {
      float t = time * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
    }
    
    c /= float(MAX_ITER);
    c = 1.17 - pow(c, 1.4);
    
    vec3 colour = vec3(pow(abs(c), 10.0));
    colour *= 0.75;
    colour = clamp(colour + vec3(0.095), 0.0, 1.0);

    // Assign the final calculated color to gl_FragColor
    gl_FragColor = vec4(colour, 1.0);
  }
`;
// moonLightFS.js (Fragment Shader)
const moonLightFS2 = `
  /*
  ================================================================================
  Moonlight Shader - v4 (Slower, New Color)
  
  This version slows down the animation speed and adjusts the color.
  Updated: June 18, 2025
  ================================================================================
  */

  uniform float iTime;
  uniform float alpha;
  varying vec2 vUv;

  float make_rays(float alignment, float speed) {
      float bands = sin(alignment * 25.0 - iTime * speed);
      return smoothstep(0.5, 1.0, bands);
  }

  void main() {
      // --- 1. Define Light Properties ---
      vec2 light_origin = vec2(1.2, 0.6);
      vec2 light_direction = normalize(vec2(-1.0, 0.0));

      // --- 2. Calculate Ray Alignment ---
      vec2 pixel_to_origin = normalize(light_origin - vUv);
      float alignment = dot(pixel_to_origin, light_direction);
      
      // --- 3. Create the Rays ---
      
      // CHANGED #1: Made rays move slower. (Decreased speed values from 3.0 and 1.5).
      float rays1 = make_rays(alignment, 0.8);
      float rays2 = make_rays(alignment * 0.8, 0.4);

      float rays_combined = rays1 * 0.6 + rays2 * 0.4;
      
      // --- 4. Add Fading and Attenuation ---
      float distance_fade = pow(max(0.0, 1.0 - length(light_origin - vUv) / 2.75), 2.0);
      float vertical_fade = pow(vUv.y, 1.5);
      float final_strength = rays_combined * distance_fade * vertical_fade;

      // --- 5. Set Final Color ---
      
      // CHANGED #2: Color adjusted to be a light, blue-ish silver.
      vec3 moon_color = vec3(0.85, 0.95, 1.0);
      
      gl_FragColor = vec4(moon_color * final_strength, final_strength * alpha);
  }
`;

export const vertexShaderGlowSkinned = `
    varying vec3 vNormal;
    varying vec3 vPositionNormal;

    #include <common>
    #include <skinning_pars_vertex>

    void main() 
    {
        // This chunk is essential. It reads the bone texture and defines
        // the boneMatX, boneMatY, etc. variables. It must come first.
        #include <skinbase_vertex>

        // These chunks use boneMatX/Y/Z/W to calculate the skinned normal.
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>

        // These chunks calculate the vertex position after skinning.
        #include <begin_vertex>
        #include <skinning_vertex>
        #include <project_vertex>

        // Now that the built-in chunks have calculated everything,
        // we can safely assign the results to our varyings.
        vNormal = normalize( transformedNormal );
        vPositionNormal = normalize( mvPosition.xyz );
    }
`;

export const vertexShaderMorph2 = `
// ==========================================
// 1. SIMPLEX NOISE FUNCTIONS (Keep these at the top)
// ==========================================
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

  // Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ ); 

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

// ==========================================
// 2. MAIN SHADER LOGIC
// ==========================================

uniform float iTime;
uniform float uTransformProgress; // 0.0 to 1.0

attribute vec3 targetPosition;
attribute vec3 targetNormal;



varying vec2 vUv;
varying vec3 vNormal; // Pass to fragment shader for lighting
varying vec3 vPositionNormal;
varying float vNoise;

void main() {
    vUv = uv;

    // A. INTERPOLATION (Morphing)
    // ------------------------------------------------
    // Mix position and normal linearly first
    vec3 mixedPosition = mix(position, targetPosition, uTransformProgress);
    vec3 mixedNormal = normalize(mix(normal, targetNormal, uTransformProgress));

    // B. LIQUID INTENSITY (The Bell Curve)
    // ------------------------------------------------
    // Starts at 0, goes to 1.0 at 50%, ends at 0
    float liquidIntensity = sin(uTransformProgress * 3.14159); 

    // C. CALCULATE OSCILLATION (Fluid Effect)
    // ------------------------------------------------
    float time = iTime * 0.8; 

    // Noise Layer 1: Base shape blob
    // Note: We use mixedPosition so the noise moves with the object
    float noise1 = snoise(mixedPosition * 0.8 + vec3(time));
    
    // Noise Layer 2: Smaller ripples
    float noise2 = snoise(mixedPosition * 2.5 - vec3(time * 1.5));
    
    // Combine noise
    // We multiply by liquidIntensity so the effect is 0 at start/end
    float displacement = ((noise1 * 0.5) + (noise2 * 0.2)) * liquidIntensity;

    // D. APPLY
    // ------------------------------------------------
    // Move the vertex outward along its normal
    vec3 finalPos = mixedPosition + (mixedNormal * displacement);
    vNoise = noise1;

    vNormal = mixedNormal; // Update normal for fragment shader
    vPositionNormal = normalize((modelViewMatrix * vec4(finalPos, 1.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}
`;
export const vertexShaderMorph = `
// ==========================================
// 1. SIMPLEX NOISE FUNCTIONS (Keep these at the top)
// ==========================================
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

  // Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ ); 

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

// ==========================================
// 2. MAIN SHADER LOGIC
// ==========================================

uniform float iTime;
uniform float uTransformProgress; // 0.0 to 1.0

attribute vec3 targetPosition;
attribute vec3 targetNormal;
uniform float uOscillationStrength;
uniform float uIsOscillating;


varying vec2 vUv;
varying vec3 vNormal; // Pass to fragment shader for lighting
varying vec3 vPositionNormal;
varying float vNoise;

void main() {
    vUv = uv;

    // A. INTERPOLATION (Morphing)
    // ------------------------------------------------
    // Mix position and normal linearly first
    vec3 mixedPosition = mix(position, targetPosition, uTransformProgress);
    vec3 mixedNormal = normalize(mix(normal, targetNormal, uTransformProgress));

    // B. LIQUID INTENSITY (The Bell Curve)
    // ------------------------------------------------
    // Starts at 0, goes to 1.0 at 50%, ends at 0
    float liquidIntensity = sin(uTransformProgress * 3.14159); 

    // C. CALCULATE OSCILLATION (Fluid Effect)
    // ------------------------------------------------
    float time = iTime * 0.8; 

    // Noise Layer 1: Base shape blob
    // Note: We use mixedPosition so the noise moves with the object
    float noise1 = snoise(mixedPosition * 0.8 + vec3(time));
    
    // Noise Layer 2: Smaller ripples
    float noise2 = snoise(mixedPosition * 2.5 - vec3(time * 1.5));
    
    // Combine noise
    // We multiply by liquidIntensity so the effect is 0 at start/end
    // float displacement = ((noise1 * 0.5) + (noise2 * 0.2)) * (liquidIntensity + (uOscillationStrength * uIsOscillating));
  float displacement = ((noise1 * 0.3) + (noise2 * 0.1)) * uOscillationStrength * uIsOscillating;

    // D. APPLY
    // ------------------------------------------------
    // Move the vertex outward along its normal
    vec3 finalPos = mixedPosition + (mixedNormal * displacement);
    vNoise = noise1;

    vNormal = mixedNormal; // Update normal for fragment shader
    vPositionNormal = normalize((modelViewMatrix * vec4(finalPos, 1.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}
`;
export const fragmentShaderMorph = `
            uniform float uProgress;
            // uniform vec3 uColorA;
            // uniform vec3 uColorB;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying float vNoise;
            
            vec3 uColorA = vec3(1.0, 1.0, 0.0);
            vec3 uColorB = vec3(0.0, 0.0, 1.0);

            void main() {
                // 1. Mix Base Colors
                vec3 finalColor = mix(uColorA, uColorB, uProgress);

                // 2. Add "Liquid" Highlight
                // We use the noise value from vertex shader to add subtle streaks
                float liquidIntensity = sin(uProgress * 3.14159);
                finalColor += vNoise * 0.1 * liquidIntensity;

                // 3. Fresnel Effect (Rim Light)
                // This makes the object look 3D and shiny
                vec3 viewDir = vec3(0.0, 0.0, 1.0); // Simplified view direction
                float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);
                
                // Add a bright rim light that gets stronger during the morph
                vec3 rimColor = vec3(1.0, 1.0, 1.0);
                finalColor += rimColor * fresnel * (0.5 + liquidIntensity);

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `

export const vertexShaderGlowSkinnedCatching = `
varying vec3 vNormal;
varying vec3 vPositionNormal;

uniform vec3 catchPoint; // Target point for the catching effect
uniform float uprogress; // Progress for animation control (0.0 to 1.0)

#include <common>
#include <skinning_pars_vertex>

// Simple pseudo-random function based on vertex position
float rand(vec3 pos) {
    return fract(sin(dot(pos, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
}

void main() 
{
    // Essential skinning setup
    #include <skinbase_vertex>

    // Calculate skinned normal
    #include <beginnormal_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>

    // Calculate skinned vertex position
    #include <begin_vertex>
    #include <skinning_vertex>

    vec3 skinnedPosition = transformed;

    // --- MODIFICATION START ---

    // 1. Convert the local skinned position to a world position
    vec4 worldPosition = modelMatrix * vec4(skinnedPosition, 1.0);

    // Calculate interpolation factor (this logic is unchanged)
    float speedVariation = 0.65 + rand(skinnedPosition) * 1.0;
    float t = clamp(uprogress * speedVariation, 0.0, 1.0);

    // 2. Linearly interpolate in WORLD SPACE
    vec3 newWorldPosition = mix(worldPosition.xyz, catchPoint, t);

    // 3. Convert the new world position back to model space for the projection
    transformed = (inverse(modelMatrix) * vec4(newWorldPosition, 1.0)).xyz;

    // --- MODIFICATION END ---

    // Apply projection after modifying the position
    #include <project_vertex>

    // Assign varyings for fragment shader
    vNormal = normalize(transformedNormal);
    vPositionNormal = normalize(mvPosition.xyz);
}
`;


export const vertexShaderOscillation = `
// Simplex 3D Noise 
// by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}


    uniform float iTime;
    uniform float uOscillationStrength;
    uniform float uIsOscillating;
    varying vec3 vNormal;
    varying vec3 vPositionNormal;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        
        // Fluid / Liquid Droplet Effect using Noise
        float time = iTime * 0.8; // Control speed
        
        // Base shape distortion (low frequency)
        float noise1 = snoise(position * 0.8 + vec3(time));
        
        // Detail distortion (higher frequency)
        float noise2 = snoise(position * 2.5 - vec3(time * 1.5));
        
        // Combine them
        float displacement = ((noise1 * 0.3) + (noise2 * 0.1)) * uOscillationStrength * uIsOscillating;

        // Apply to position along the normal
        vec3 newPos = position + normal * displacement;

        vPositionNormal = normalize((modelViewMatrix * vec4(newPos, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
`;

export const fragmentShaderBitcoin = `
uniform vec3 glowColor;
uniform float glowIntensity;
uniform float glowPower;
varying vec3 vNormal;
varying vec3 vPositionNormal;

void main() 
{
    // Fix: Use simple dot product. 
    // Surfaces facing camera (dot ~ 1) will be dimmer if we want edge glow.
    // Surfaces facing away (dot < 0) should be culled or handled.
    
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vPositionNormal); // This is actually View Position in camera space, so ViewDir is -vPositionNormal
    
    // In Camera space, the camera is at (0,0,0) and looks down -Z. 
    // vPositionNormal coming from vertex shader: normalize((modelViewMatrix * vec4(position, 1.0)).xyz)
    // This vector points FROM camera TO vertex. 
    // So typical viewDir (Vertex to Eye) is -vPositionNormal.
    
    // Fresnel = 1 - dot(N, V). 
    // If dot(N, V) is 1 (facing), fresnel is 0 (center transparent).
    // If dot(N, V) is 0 (edge), fresnel is 1 (edge bright).
    
    float viewDot = dot(normal, -viewDir); // Standard N dot V
    float fresnel = 1.0 - clamp(viewDot, 0.0, 1.0); // Clamp to ignore backfaces if any
    
    float a = smoothstep(0.0, 1.0, pow(fresnel, glowPower)) * glowIntensity;
    
    // Add a base opacity so it's not fully transparent in the center?
    // User complaint: "faces which are not facing the camera are almost transparent" 
    // This implies they WANT back-faces or side-faces to be visible/handled differently.
    // If they want a solid gold coin with rim light, we should add base color.
    
    // Mix Base Gold Color with Glow
    vec3 baseColor = vec3(1.0, 0.84, 0.0); // Gold
    
    // Simple lighting for base
    float light = clamp(dot(normal, vec3(0.0, 1.0, 1.0)), 0.2, 1.0);
    
    // Combine: Base Color + Fresnel Glow
    vec3 finalColor = baseColor * light + (glowColor * a);
    
    // Force alpha to 1.0 because it's a solid coin, not a ghost
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// --- Master Factory ---

export function createGlowMaterial(options = {}) {
  const {
    type = "inner", // inner, outer, bitcoin
    color = "#ff0000",
    power = 1.0,
    intensity = 1.0,
    strength = 1.0, // For user convenience (alias for intensity or outerGlowStrength)
    border = 6.5,   // For outer glow
    p = 1.0,        // For outer glow

    // Features
    skinned = false,
    oscillating = false,
    morphing = false,
    catching = false, // Special case

    // Oscillation params
    oscillationStrength = 1.0,
    isOscillating = 1.0,

    // Catching params
    catchPoint = new THREE.Vector3(),

    // Render params
    side = THREE.FrontSide,
    blending = THREE.AdditiveBlending,
    transparent = true,
    depthWrite = undefined // Auto-decide if undefined
  } = options;

  const uniforms = {};

  // 1. Uniform Setup
  if (type === "bitcoin") {
    uniforms.glowColor = { value: new THREE.Color(color) };
    uniforms.glowPower = { value: power };
    uniforms.glowIntensity = { value: intensity };
  } else if (type === "outer") {
    uniforms.outerGlowStrength = { value: strength }; // Note: Using strength arg
    uniforms.outerGlowBorder = { value: border };
    uniforms.p = { value: p };
    uniforms.glowColor = { value: new THREE.Color(color) };
  } else {
    // Inner Glow
    uniforms.glowColor = { value: new THREE.Color(color) };
    uniforms.glowPower = { value: power };
    uniforms.glowIntensity = { value: intensity };
  }

  if (oscillating || type === "bitcoin") { // Bitcoin has built-in oscillation support in its shader setup
    uniforms.iTime = { value: 0 };
    uniforms.uOscillationStrength = { value: oscillationStrength };
    uniforms.uIsOscillating = { value: type === "bitcoin" ? 0.0 : isOscillating }; // Bitcoin defaults off
  }

  if (morphing) {
    uniforms.uTransformProgress = { value: 0 };
  }

  if (catching) {
    uniforms.uprogress = { value: 0.0 };
    uniforms.catchPoint = { value: catchPoint };
  }

  // 2. Fragment Shader Selection
  let fragmentShader = fragmentShaderInnerGlow;
  if (type === "outer") fragmentShader = fragmentShaderOuterGlow;
  if (type === "bitcoin") fragmentShader = fragmentShaderBitcoin;

  // 3. Vertex Shader Selection
  let vertexShader = vertexShaderGlow;
  if (skinned) vertexShader = vertexShaderGlowSkinned;
  if (catching) vertexShader = vertexShaderGlowSkinnedCatching;
  if (oscillating) vertexShader = vertexShaderOscillation;
  if (morphing) vertexShader = vertexShaderMorph; // Note: Morph implies oscillation often, check logic

  // 4. Create Material
  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: side,
    blending: blending,
    transparent: transparent,
    depthWrite: depthWrite !== undefined ? depthWrite : (type === "bitcoin" ? true : false)
  });
}

// --- Wrapper Functions (Preserving API) ---




// --- Simplified Material Factories ---
// Usage: createInnerGlow("#FBC189", { oscillating: true })

const DEFAULT_GOLD = "#FBC189";

export function createInnerGlow(color = DEFAULT_GOLD, options = {}) {
  return createGlowMaterial({
    type: "inner",
    color: color,
    power: 1.0,
    intensity: 1.0,
    side: THREE.FrontSide,
    ...options
  });
}

export function createOuterGlow(color = DEFAULT_GOLD, options = {}) {
  return createGlowMaterial({
    type: "outer",
    color: color,
    strength: 1.0, // Default intensity mapping
    border: 0.01,
    p: 6.5,
    side: THREE.FrontSide,
    depthWrite: false,
    ...options
  });
}

export function createBitcoinMat(color = DEFAULT_GOLD, options = {}) {
  return createGlowMaterial({
    type: "bitcoin",
    color: color,
    power: 1.0,
    intensity: 1.0,
    oscillating: true,
    oscillationStrength: 0.1,
    isOscillating: 0.0,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
    transparent: false,
    depthWrite: true,
    ...options
  });
}

// Legacy Compatibility (Optional: keep these if you want a phased migration, but Plan says 'Update Call Sites')
// For now, I will NOT export the old names to force myself to find and fix usages.
