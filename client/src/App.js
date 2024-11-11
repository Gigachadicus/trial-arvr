import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { AnimationMixer, Vector3 } from 'three';
import './App.css';

const Model = ({ url, position, visible, setModelCoordinates }) => {
  const { scene, animations } = useGLTF(url);
  const mixer = useRef();

  useEffect(() => {
    if (animations && animations.length) {
      mixer.current = new AnimationMixer(scene);
      animations.forEach((clip) => {
        mixer.current.clipAction(clip).play();
      });
    }

    // Function to extract bone joint coordinates using matrixWorld
    const extractBoneJointCoordinates = () => {
      const coordinates = [];
      scene.traverse((child) => {
        if (child.isBone) {
          const worldPosition = new Vector3();
          child.updateMatrixWorld(true); // Ensure matrixWorld is up-to-date
          worldPosition.setFromMatrixPosition(child.matrixWorld); // Extract position from matrixWorld
          coordinates.push([worldPosition.x, worldPosition.y, worldPosition.z]);
        }
      });
      setModelCoordinates(coordinates);
    };

    // Call to extract initial coordinates
    extractBoneJointCoordinates();

    return () => {
      mixer.current = null; // Clean up the mixer on unmount
    };
  }, [animations, scene, setModelCoordinates]);

  useFrame((state, delta) => {
    const speedFactor = 0.2; // Adjust this value to slow down the animation
    mixer.current?.update(delta * speedFactor);
  });

  return <primitive object={scene} position={position} visible={visible} />;
};

const Ground = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
    <planeGeometry args={[200, 200]} />
    <meshStandardMaterial color="gray" />
  </mesh>
);

function App() {
  const [selectedModel, setSelectedModel] = useState('trial-1.glb');
  const [modelCoordinates, setModelCoordinates] = useState([]);
  const [similarity, setSimilarity] = useState(0); // State for similarity percentage
  const [loading, setLoading] = useState(true); // State for loading
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Access the webcam
    const getWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error accessing the webcam:", err);
      } finally {
        setLoading(false); // Set loading to false once webcam access is attempted
      }
    };
    
    getWebcam();
  }, []);

  useEffect(() => {
    const sendFrameToServer = async () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Send both the image and model coordinates to the backend
      try {
        const response = await fetch('http://localhost:5000/coordinates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageData, modelCoordinates }), // Sending only bone coordinates
        });
        const data = await response.json();
        console.log('Similarity Percentage:', data.similarity); // Log similarity percentage
        setSimilarity(data["similarity"]); // Update similarity state
        console.log("Received model coordinates:");
        console.log(data.filtered_model_coordinates);
        console.log("Received video coordinates:");
        console.log(data.filtered_video_coordinates);
      } catch (error) {
        console.error('Error sending coordinates:', error);
      }
    };

    const intervalId = setInterval(() => {
      sendFrameToServer();
    }, 1000); // Send a frame every second

    return () => clearInterval(intervalId);
  }, [modelCoordinates]);

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Loading Screen */}
      {loading && (
        <div className="loading-screen">
          <div className="spinner"></div>
          <h2>Loading...</h2>
        </div>
      )}

      {/* Health Bar Section */}
      <div className="health-bar-container" style={{ width: '100%', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ margin: '0', color: '#333' }}>Health Bar</h2>
        <div 
          className="health-bar" 
          style={{ 
            width: '100%', 
            height: '30px', 
            backgroundColor: '#e0e0e0', 
            borderRadius: '5px', 
            overflow: 'hidden', 
            margin: '0 auto', 
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)', 
            position: 'relative'
          }}
        >
          <div 
            className="health-fill" 
            style={{ 
              width: `${similarity}%`, 
              height: '100%', 
              backgroundColor: similarity > 70 ? 'green' : similarity > 40 ? 'yellow' : 'red', 
              transition: 'width 0.5s ease-in-out' 
            }} 
          />
        </div>
        <p style={{ marginTop: '10px', fontWeight: 'bold', color: '#555' }}>{(similarity ?? 0).toFixed(2)}%</p>
      </div>

      <div className="container" style={{ display: 'flex', width: '100%' }}>
        <div className="mediaPipe" style={{ position: 'relative', width: '50%', padding: '10px' }}>
          <video ref={videoRef} style={{ width: '100%', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }} autoPlay />
          <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />
        </div>
        <div className="modelViewer" style={{ width: '50%', position: 'relative', padding: '10px' }}>
          <select 
            onChange={(e) => setSelectedModel(e.target.value)} 
            value={selectedModel} 
            style={{ 
              position: 'absolute', 
              top: '10px', 
              left: '10px', 
              zIndex: 1, 
              padding: '10px', 
              borderRadius: '5px', 
              border: '1px solid #ccc', 
              backgroundColor: '#fff', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)' 
            }}
          >
            <option value="trial-1.glb">Model 1</option>
            <option value="trial-2.glb">Model 2</option>
          </select>
          <Canvas style={{ height: '100vh', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }} shadows>
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 15, 10]}
              intensity={1.5}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={0.5}
              shadow-camera-far={50}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
            />
            <pointLight position={[0, 5, 0]} intensity={50} distance={5} decay={0.5} castShadow />

            <Model 
              url={`/models/${selectedModel}`} 
              position={[-2, 0, 0]} 
              visible={true}
              setModelCoordinates={setModelCoordinates}
            />
            
            <Ground />
            <OrbitControls />
          </Canvas>
        </div>
        
      </div>
    </div>
  );
}

export default App;
