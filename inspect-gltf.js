import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

const loader = new GLTFLoader();
const file = path.resolve('src/assets/models/ice-cream.glb');

const buffer = fs.readFileSync(file);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

loader.parse(arrayBuffer, '', (gltf) => {
  const scene = gltf.scene;
  const meshInfo = [];

  scene.traverse((obj) => {
    if (obj.isMesh) {
      const materialNames = Array.isArray(obj.material)
        ? obj.material.map((mat) => mat.name || '(unnamed)')
        : [obj.material?.name || '(unnamed)'];

      meshInfo.push({
        name: obj.name || '(unnamed)',
        materialNames,
        position: obj.position.toArray().map((v) => Number(v.toFixed(4))),
        scale: obj.scale.toArray().map((v) => Number(v.toFixed(4))),
      });
    }
  });

  console.log(JSON.stringify(meshInfo, null, 2));
}, undefined, (error) => {
  console.error(error);
  process.exit(1);
});
