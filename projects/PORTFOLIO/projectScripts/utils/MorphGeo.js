import * as THREE from 'three';

export function linkConstantUniforms(scene, material, keys) {
    if (!material || !material.uniforms) return;
    keys.forEach(key => {
        if (scene.constantUniform[key]) {
            material.uniforms[key] = scene.constantUniform[key];
        }
    });
}


function createPaddedAttribute(sourceAttribute, count, defaultItemSize, defaultFill = null, forcedArrayType = null, paddingMode = 'REPEAT') {
    const itemSize = sourceAttribute ? sourceAttribute.itemSize : defaultItemSize;
    // Use forced type, or source array constructor, or Float32Array by default
    const ArrayConstructor = forcedArrayType ? forcedArrayType : (sourceAttribute ? sourceAttribute.array.constructor : Float32Array);
    const newArray = new ArrayConstructor(count * itemSize);

    // 1. Fill with default value if provided (used if no source)
    if (defaultFill && defaultFill.length === itemSize) {
        for (let i = 0; i < count; i++) {
            for (let j = 0; j < itemSize; j++) {
                newArray[i * itemSize + j] = defaultFill[j];
            }
        }
    }

    // 2. Overwrite with source data AND repeat to fill
    if (sourceAttribute) {
        const srcArray = sourceAttribute.array;
        const srcLen = srcArray.length;

        // Copy source
        newArray.set(srcArray);

        // Fill remaining with repeated source data
        // This prevents "extra" vertices (needed by other geometries) from being 0,0,0
        if (paddingMode === 'REPEAT') {
            for (let i = srcLen; i < newArray.length; i++) {
                newArray[i] = srcArray[i % srcLen];
            }
        }
    }

    return new THREE.BufferAttribute(newArray, itemSize);
}

export class MorphGeo extends THREE.BufferGeometry {
    constructor(targetGeos) {
        super();
        this.isMorphGeo = true;
        this.targetGeos = targetGeos;

        // Normalize targetGeos to array
        const targets = Array.isArray(targetGeos) ? targetGeos : [targetGeos];

        // 1. Max Vertex Count
        const maxCount = Math.max(...targets.map(geo => geo.attributes.position ? geo.attributes.position.count : 0));
        this.maxCount = maxCount;

        // 2. Max Index Count (for faces)
        // Some geometries might not have index (just vertices), handle that? Assume all have index for now or 0.
        const maxIndexCount = Math.max(...targets.map(geo => geo.index ? geo.index.count : 0));

        const hasUV = targets.some(geo => geo.attributes.uv);
        const hasNormal = targets.some(geo => geo.attributes.normal);

        this.morphInfo = [];
        targetGeos.forEach((geo) => {
            let paddedIndex = null;
            if (geo.index) { // Assuming all have indices or we handle it
                // Check if we need to pad indices
                // Indices are 1 itemSize usually
                // We need to pad to maxIndexCount.
                // Default fill 0 is fine (degenerate triangles at index 0)
                // Force Uint32Array for consistency across all geometries
                // Use 'ZERO' mode for indices to avoid repeating geometry (ghosting)
                paddedIndex = createPaddedAttribute(geo.index, maxIndexCount, 1, null, Uint32Array, 'ZERO');
            }

            let info = {
                position: createPaddedAttribute(geo.attributes.position, maxCount, 3),
                normal: hasNormal ? createPaddedAttribute(geo.attributes.normal, maxCount, 3, [0, 1, 0]) : null,
                uv: hasUV ? createPaddedAttribute(geo.attributes.uv, maxCount, 2) : null,
                index: paddedIndex,
            }
            this.morphInfo.push(info);
        })
        // console.log(this)
    }

    setMorphInfo(sourceIndex, targetIndex = null) {

        targetIndex = (targetIndex !== null && targetIndex !== undefined) ? targetIndex : sourceIndex;
        let srcInfo = this.morphInfo[sourceIndex];
        let tarInfo = this.morphInfo[targetIndex];

        if (srcInfo.position) this.setAttribute('position', srcInfo.position);
        if (srcInfo.normal) this.setAttribute('normal', srcInfo.normal);
        if (srcInfo.uv) this.setAttribute('uv', srcInfo.uv);

        if (srcInfo.index) {
            this.setIndex(srcInfo.index);
            this.originalIndex = srcInfo.index;
        }

        if (tarInfo.position) this.setAttribute('targetPosition', tarInfo.position);
        if (tarInfo.normal) this.setAttribute('targetNormal', tarInfo.normal);
        if (tarInfo.uv) this.setAttribute('targetUV', tarInfo.uv);

        // Target index is usually not used for rendering directly, but for logic in test.js
        if (tarInfo.index) this.targetIndex = tarInfo.index;

    }

    addTargets(extraGeos) {
        const targets = Array.isArray(extraGeos) ? extraGeos : [extraGeos];
        this.targetGeos.push(...targets);

        const maxCount = this.maxCount;

        // Caution: If new targets usually have more vertices, they will be truncated if we don't update maxCount.
        // For now, using existing maxCount.

        const maxIndexCount = Math.max(...targets.map(geo => geo.index ? geo.index.count : 0));

        const hasUV = targets.some(geo => geo.attributes.uv);
        const hasNormal = targets.some(geo => geo.attributes.normal);

        targets.forEach((geo) => {
            let paddedIndex = null;
            if (geo.index) {
                const indexCount = Math.max(maxIndexCount, geo.index.count);
                paddedIndex = createPaddedAttribute(geo.index, indexCount, 1, null, Uint32Array, 'ZERO');
            }

            let info = {
                position: createPaddedAttribute(geo.attributes.position, maxCount, 3),
                normal: (hasNormal || this.attributes && this.attributes.normal) ? createPaddedAttribute(geo.attributes.normal, maxCount, 3, [0, 1, 0]) : null,
                uv: (hasUV || this.attributes && this.attributes.uv) ? createPaddedAttribute(geo.attributes.uv, maxCount, 2) : null,
                index: paddedIndex,
            }
            this.morphInfo.push(info);
        });
    }

}

// export class MorphMaterial extends THREE.ShaderMaterial {
//     constructor(materia) {
//         super();
//     }

// }
// export class MorphMesh extends THREE.Mesh {
//     constructor(morphGeo, material, scene) {
//         super(morphGeo, material);
//         this.morphGeo = morphGeo;

//         this.uniforms = material.uniforms;

//         //check if  the material uniform has uTransformProgress, if no, assign 1
//         if (!material.uniforms.uTransformProgress) {
//             material.uniforms.uTransformProgress = { value: 0 };
//         }
//         this.uTransformProgress = material.uniforms.uTransformProgress;
//         this.linkConstantUniform(scene, material, ['iTime']);
//     }
//     linkConstantUniform(scene, material, keys) {
//         if (!material || !material.uniforms) return;
//         keys.forEach(key => {
//             if (scene.constantUniform[key]) {
//                 material.uniforms[key] = scene.constantUniform[key];
//             }
//         });
//     }

// }
