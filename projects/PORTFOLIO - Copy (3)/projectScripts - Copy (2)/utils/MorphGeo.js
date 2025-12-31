import * as THREE from 'three';

function createPaddedAttribute(sourceAttribute, size) {
    const array = sourceAttribute.array;
    const itemSize = sourceAttribute.itemSize;
    const newArray = new Float32Array(size * itemSize);
    newArray.set(array); // Copy existing data
    // Remaining is 0-padded

    return new THREE.BufferAttribute(newArray, itemSize);
}

export class MorphGeo extends THREE.BufferGeometry {
    constructor(targetGeos) {
        super();
        this.targetGeos = targetGeos;

        // Normalize targetGeos to array
        const targets = Array.isArray(targetGeos) ? targetGeos : [targetGeos];

        // Calculate Max Count across base and all targets

        const maxCount = Math.max(...targets.map(geo => geo.attributes.position ? geo.attributes.position.count : 0));
        this.maxCount = maxCount;

        this.morphInfo = [];
        targetGeos.forEach((geo) => {

            let info = {
                position: geo.attributes.position ? createPaddedAttribute(geo.attributes.position, maxCount) : null,
                normal: geo.attributes.normal ? createPaddedAttribute(geo.attributes.normal, maxCount) : null,
                uv: geo.attributes.uv ? createPaddedAttribute(geo.attributes.uv, maxCount) : null,
                index: geo.index,
            }
            this.morphInfo.push(info);
        })
        console.log(this)
        // this.setMorphInfo(0)

    }

    setMorphInfo(sourceIndex, targetIndex = null) {

        targetIndex = targetIndex || sourceIndex;
        let srcInfo = this.morphInfo[sourceIndex];
        let tarInfo = this.morphInfo[targetIndex];

        if (srcInfo.position) this.setAttribute('position', srcInfo.position);
        if (srcInfo.normal) this.setAttribute('normal', srcInfo.normal);
        if (srcInfo.uv) this.setAttribute('uv', srcInfo.uv);
        this.setIndex(srcInfo.index);
        this.originalIndex = srcInfo.index;

        if (tarInfo.position) this.setAttribute('targetPosition', tarInfo.position);
        if (tarInfo.normal) this.setAttribute('targetNormal', tarInfo.normal);
        if (tarInfo.uv) this.setAttribute('targetUV', tarInfo.uv);
        // Do NOT overwrite index with target index here. Let test.js handle swapping or default to source.
        this.targetIndex = tarInfo.index;

    }

}
