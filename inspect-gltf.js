import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';

const loader = new GLTFLoader();
const file = path.resolve('src/assets/models/ice-cream.glb');

const buffer = fs.readFileSync(file);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

loader.parse(arrayBuffer, '', (gltf) => {
  const scene = gltf.scene;
  const objectInfo = [];

  scene.updateWorldMatrix(true, true);

  scene.traverse((obj) => {
    const name = obj.name || '(unnamed)';
    const parentName = obj.parent?.name || '(none)';
    const base = {
      name,
      type: obj.type,
      parentName,
      position: obj.position.toArray().map((v) => Number(v.toFixed(4))),
      scale: obj.scale.toArray().map((v) => Number(v.toFixed(4))),
      rotation: obj.rotation.toArray().slice(0, 3).map((v) => Number(v.toFixed(4))),
    };

    if (!obj.isMesh) {
      objectInfo.push(base);
      return;
    }

    const geometry = obj.geometry;
    const geometryInfo = geometry
      ? {
          type: geometry.type,
          vertexCount: geometry.attributes?.position?.count || 0,
          indexCount: geometry.index?.count || 0,
        }
      : null;

    const materialNames = Array.isArray(obj.material)
      ? obj.material.map((mat) => mat?.name || '(unnamed)')
      : [obj.material?.name || '(unnamed)'];

    const localBbox = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
    const localSize = new THREE.Vector3();
    localBbox.getSize(localSize);

    const worldBbox = new THREE.Box3().setFromObject(obj);
    const worldSize = new THREE.Vector3();
    const worldCenter = new THREE.Vector3();
    worldBbox.getSize(worldSize);
    worldBbox.getCenter(worldCenter);

    objectInfo.push({
      ...base,
      geometry: geometryInfo,
      materialNames,
      localBoundingBox: {
        min: localBbox.min.toArray().map((v) => Number(v.toFixed(4))),
        max: localBbox.max.toArray().map((v) => Number(v.toFixed(4))),
        size: localSize.toArray().map((v) => Number(v.toFixed(4))),
      },
      worldBoundingBox: {
        min: worldBbox.min.toArray().map((v) => Number(v.toFixed(4))),
        max: worldBbox.max.toArray().map((v) => Number(v.toFixed(4))),
        size: worldSize.toArray().map((v) => Number(v.toFixed(4))),
        center: worldCenter.toArray().map((v) => Number(v.toFixed(4))),
      },
    });
  });

  console.log(JSON.stringify(objectInfo, null, 2));
}, undefined, (error) => {
  console.error(error);
  process.exit(1);
});
