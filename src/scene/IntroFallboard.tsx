import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import { clamp01, easeInOutCubic } from './easing';
import { SCENE_COLORS } from './materials';
import { getWoodTexture } from './textures';

export interface IntroFallboardProps {
  readonly keyboardWidth: number;
  /** Вызывается один раз, когда крышка полностью открылась и растворилась. */
  readonly onComplete: () => void;
}

/** Пауза с закрытой крышкой: даёт сцене «вдохнуть» перед открытием. */
const HOLD_SECONDS = 0.5;
const OPEN_SECONDS = 1.9;
/** Закрытая крышка чуть наклонена вперёд, как настоящий фальборд. */
const CLOSED_ANGLE = 0.095;
const OPEN_ANGLE = -1.35;
/** С этой доли подъёма крышка начинает растворяться в свете. */
const FADE_START = 0.55;

/** Шарнир — у задней кромки клавиш, на уровне козырька фальш-панели. */
const HINGE_Y = 1.32;
const HINGE_Z = -2.4;
const LID_LENGTH = 6.2;
const LID_THICKNESS = 0.18;

/**
 * Стартовая «вау»-анимация: фортепиано появляется с закрытой крышкой
 * клавиатуры, затем она плавно поднимается на шарнире и тает,
 * открывая клавиши свету. После завершения компонент размонтируется.
 */
export function IntroFallboard({ keyboardWidth, onComplete }: IntroFallboardProps) {
  const hingeRef = useRef<Group>(null);
  const lidRef = useRef<Mesh>(null);
  const woodMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const brassMaterialRef = useRef<MeshStandardMaterial>(null);
  const startTimeRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const lidWidth = keyboardWidth + 0.2;

  useFrame(({ clock }) => {
    const hinge = hingeRef.current;

    if (doneRef.current || hinge === null) {
      return;
    }

    startTimeRef.current ??= clock.elapsedTime;
    const progress = clamp01(
      (clock.elapsedTime - startTimeRef.current - HOLD_SECONDS) / OPEN_SECONDS
    );

    hinge.rotation.x = CLOSED_ANGLE + (OPEN_ANGLE - CLOSED_ANGLE) * easeInOutCubic(progress);

    const opacity = 1 - clamp01((progress - FADE_START) / (1 - FADE_START));

    if (woodMaterialRef.current !== null) {
      woodMaterialRef.current.opacity = opacity;
    }

    if (brassMaterialRef.current !== null) {
      brassMaterialRef.current.opacity = opacity;
    }

    // Полупрозрачная крышка не должна оставлять плотную тень на клавишах.
    if (lidRef.current !== null) {
      lidRef.current.castShadow = opacity > 0.35;
    }

    if (progress >= 1) {
      doneRef.current = true;
      onComplete();
    }
  });

  return (
    <group ref={hingeRef} position={[0, HINGE_Y, HINGE_Z]} rotation={[CLOSED_ANGLE, 0, 0]}>
      <mesh
        ref={lidRef}
        position={[0, -LID_THICKNESS / 2, LID_LENGTH / 2]}
        castShadow
        raycast={() => null}
      >
        <boxGeometry args={[lidWidth, LID_THICKNESS, LID_LENGTH]} />
        <meshPhysicalMaterial
          ref={woodMaterialRef}
          map={getWoodTexture()}
          color={SCENE_COLORS.body}
          roughness={0.36}
          metalness={0}
          clearcoat={0.85}
          clearcoatRoughness={0.16}
          transparent
        />
      </mesh>

      {/* Латунная губа на переднем торце крышки */}
      <mesh position={[0, -LID_THICKNESS / 2, LID_LENGTH - 0.04]} raycast={() => null}>
        <boxGeometry args={[lidWidth, LID_THICKNESS + 0.06, 0.12]} />
        <meshStandardMaterial
          ref={brassMaterialRef}
          color={SCENE_COLORS.brass}
          roughness={0.38}
          metalness={0.85}
          transparent
        />
      </mesh>
    </group>
  );
}
