import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MagicLampProps {
  onRub: () => void;
}

export const MagicLamp: React.FC<MagicLampProps> = ({ onRub }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.06;
    groupRef.current.rotation.y += 0.002;
  });

  return (
    <group ref={groupRef} onClick={onRub}>
      {/* Main lamp body */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#c9982b" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Lamp spout (handle) */}
      <mesh position={[0.56, 0.06, 0]} rotation={[0, 0, Math.PI / 2.8]}>
        <torusGeometry args={[0.24, 0.08, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#8e6618" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* Lamp cap/lid */}
      <mesh position={[-0.68, 0.18, 0]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.18, 0.54, 20]} />
        <meshStandardMaterial color="#d5a62f" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Lamp base */}
      <mesh position={[0, -0.48, 0]} scale={[1.15, 0.32, 1.15]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#6f4f16" metalness={0.55} roughness={0.5} />
      </mesh>
    </group>
  );
};
