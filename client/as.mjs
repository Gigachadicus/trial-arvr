import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { AnimationMixer, Vector3 } from 'three';
import './App.css';

// Load the model and extract bone data
const loadModelAndExtractBones = (modelPath) => {
  const loader = new GLTFLoader();

  loader.load(
    modelPath,
    (gltf) => {
      const scene = gltf.scene;
      const boneData = [];

      scene.traverse((child) => {
        if (child.isBone) {
          const worldPosition = new Vector3();
          child.updateMatrixWorld(true);
          worldPosition.setFromMatrixPosition(child.matrixWorld);

          // Store bone name and coordinates for further analysis
          boneData.push({
            name: child.name,
            position: {
              x: worldPosition.x,
              y: worldPosition.y,
              z: worldPosition.z,
            },
          });
        }
      });

      // Output the bone data for analysis
      console.log("Extracted Bone Data:", boneData);
    },
    undefined,
    (error) => {
      console.error("An error occurred while loading the model:", error);
    }
  );
};

// Provide the relative path to the model file
const modelPath = 'client/public/models/trial-1.glb';
loadModelAndExtractBones(modelPath);
