import { useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { IntroFallboard } from './IntroFallboard';
import { PianoKeyboard3D } from './PianoKeyboard3D';
import { getStudioCameraPlacement, type StudioCameraPlacement } from './camera';
import { clamp01, easeInOutCubic } from './easing';
import { getKeyboardWidth } from './geometry';
import { SCENE_COLORS } from './materials';
import type {
  KeyboardKeyViewModel,
  KeyboardViewModel,
  KeyboardViewport,
  PhysicalPitchClass
} from '../music/types';

export interface PianoStudioSceneProps {
  readonly viewModel: KeyboardViewModel;
  readonly chordRootPitchClass: PhysicalPitchClass | null;
  readonly motionEnabled: boolean;
  /** Фактическая ширина, занятая боковыми панелями HUD (px). */
  readonly hudSidePx?: number;
  readonly onSelectKey: (key: KeyboardKeyViewModel) => void;
}

export function PianoStudioScene({
  viewModel,
  chordRootPitchClass,
  motionEnabled,
  hudSidePx,
  onSelectKey
}: PianoStudioSceneProps) {
  const keyboardWidth = getKeyboardWidth(viewModel.octaveCount);
  // Стартовая анимация играет один раз при запуске; при reduced motion — пропускается.
  const [introPlaying, setIntroPlaying] = useState(() => motionEnabled);

  return (
    <Canvas
      className="studio-canvas"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 41, near: 0.5, far: 220 }}
    >
      <color attach="background" args={[SCENE_COLORS.background]} />
      <fog attach="fog" args={[SCENE_COLORS.fog, 30, 85]} />

      <FixedStudioCamera
        keyboardWidth={keyboardWidth}
        viewport={viewModel.viewport}
        hudSidePx={hudSidePx}
        introEnabled={introPlaying}
      />

      {/* Холодный северный свет: направленный ключевой над клавишами + тёплый акцент для уюта */}
      <ambientLight intensity={0.34} color="#d8e2f4" />
      <spotLight
        position={[0, 30, 16]}
        intensity={3600}
        color="#edf3ff"
        angle={0.4}
        penumbra={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
      />
      <spotLight
        position={[-20, 12, 8]}
        intensity={380}
        color="#c8d8f2"
        angle={0.5}
        penumbra={1}
      />
      <directionalLight position={[16, 12, -8]} intensity={0.5} color="#7e9ad8" />
      <pointLight position={[0, 4.4, -6]} intensity={9} color="#e6b87a" />
      {/* Фронтальная подсветка корпуса: проявляет текстуру дерева на панели */}
      <pointLight position={[0, 5, 6]} intensity={55} color="#dce5f4" />

      <PianoKeyboard3D
        viewModel={viewModel}
        chordRootPitchClass={chordRootPitchClass}
        motionEnabled={motionEnabled}
        onSelectKey={onSelectKey}
      />

      {introPlaying ? (
        <IntroFallboard
          keyboardWidth={keyboardWidth}
          onComplete={() => setIntroPlaying(false)}
        />
      ) : null}

      {/* Пол студии и теплое световое пятно */}
      <mesh position={[0, -2.32, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color={SCENE_COLORS.floor} roughness={0.92} />
      </mesh>
      <mesh position={[0, -2.31, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[30, 48]} />
        <meshStandardMaterial color={SCENE_COLORS.floorPool} roughness={0.88} transparent opacity={0.6} />
      </mesh>

      {/* Задняя стена комнаты */}
      <mesh position={[0, 16, -42]}>
        <planeGeometry args={[300, 90]} />
        <meshStandardMaterial color={SCENE_COLORS.wall} roughness={1} />
      </mesh>
    </Canvas>
  );
}

interface FixedStudioCameraProps {
  readonly keyboardWidth: number;
  readonly viewport: KeyboardViewport;
  readonly hudSidePx?: number;
  readonly introEnabled: boolean;
}

/** Наезд камеры заканчивается вместе с растворением крышки. */
const CAMERA_INTRO_SECONDS = 2.4;
/** Стартовая дистанция: камера начинает чуть дальше и «подплывает». */
const CAMERA_INTRO_DISTANCE_SCALE = 1.16;
/** Лёгкий боковой дрейф для параллакса вместо плоского зума. */
const CAMERA_INTRO_SIDE_OFFSET = -1.6;

function FixedStudioCamera({ keyboardWidth, viewport, hudSidePx, introEnabled }: FixedStudioCameraProps) {
  const get = useThree((state) => state.get);
  const size = useThree((state) => state.size);
  const placementRef = useRef<StudioCameraPlacement | null>(null);
  const introDoneRef = useRef(!introEnabled);
  const introStartRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const camera = get().camera;
    const aspect = size.width / Math.max(size.height, 1);
    const placement = getStudioCameraPlacement(
      keyboardWidth,
      aspect,
      viewport,
      size.width,
      hudSidePx
    );

    placementRef.current = placement;
    camera.position.set(...placement.position);
    camera.lookAt(placement.target[0], placement.target[1], placement.target[2]);

    if (camera instanceof PerspectiveCamera) {
      camera.fov = placement.fov;
      camera.updateProjectionMatrix();
    }
  }, [get, hudSidePx, keyboardWidth, size.height, size.width, viewport]);

  useFrame(({ camera, clock }) => {
    const placement = placementRef.current;

    if (introDoneRef.current || placement === null) {
      return;
    }

    introStartRef.current ??= clock.elapsedTime;
    const progress = clamp01((clock.elapsedTime - introStartRef.current) / CAMERA_INTRO_SECONDS);
    const eased = easeInOutCubic(progress);
    const pull = CAMERA_INTRO_DISTANCE_SCALE - (CAMERA_INTRO_DISTANCE_SCALE - 1) * eased;
    const [targetX, targetY, targetZ] = placement.target;

    camera.position.set(
      targetX + (placement.position[0] - targetX) * pull + CAMERA_INTRO_SIDE_OFFSET * (1 - eased),
      targetY + (placement.position[1] - targetY) * pull,
      targetZ + (placement.position[2] - targetZ) * pull
    );
    camera.lookAt(targetX, targetY, targetZ);

    if (progress >= 1) {
      introDoneRef.current = true;
    }
  });

  return null;
}
