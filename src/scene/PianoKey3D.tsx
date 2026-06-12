import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, useCursor } from '@react-three/drei';
import { Color, type MeshPhysicalMaterial } from 'three';
import keyLabelFontUrl from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff';
import {
  BLACK_KEY_HEIGHT,
  BLACK_KEY_LENGTH,
  BLACK_KEY_WIDTH,
  WHITE_KEY_HEIGHT,
  WHITE_KEY_LENGTH,
  WHITE_KEY_WIDTH,
  type KeyPlacement
} from './geometry';
import { HIGHLIGHT_COLORS, SCENE_COLORS } from './materials';
import { getIvoryTexture } from './textures';
import type { KeyboardKeyViewModel } from '../music/types';

/**
 * Подсветка позиции аккорда:
 * root/primary — рекомендуемая позиция для игры (root — с какой ноты начинать),
 * echo — те же ноты в остальных октавах, приглушены.
 */
export type ChordKeyEmphasis = 'root' | 'primary' | 'echo';

export interface PianoKey3DProps {
  readonly keyModel: KeyboardKeyViewModel;
  readonly placement: KeyPlacement;
  readonly motionEnabled: boolean;
  readonly chordEmphasis: ChordKeyEmphasis | null;
  readonly onSelect: (key: KeyboardKeyViewModel) => void;
}

/** Аккордная нота светится изнутри клавиши, а не плитой поверх неё. */
const CHORD_GLOW_INTENSITY: Record<ChordKeyEmphasis, number> = {
  root: 0.55,
  primary: 0.45,
  echo: 0.1
};

/** Доля цвета аккорда, подмешиваемая в базовый цвет клавиши. */
const CHORD_COLOR_MIX: Record<ChordKeyEmphasis, number> = {
  root: 0.8,
  primary: 0.68,
  echo: 0.22
};

const HOVER_GLOW = new Color('#ffe7bd');
const PRESS_DEPTH = 0.07;

export function PianoKey3D({
  keyModel,
  placement,
  motionEnabled,
  chordEmphasis,
  onSelect
}: PianoKey3DProps) {
  const keyMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  useCursor(hovered);

  const isWhite = keyModel.isWhiteKey;
  const inScale = keyModel.highlightLayers.includes('inScale');
  const isTonic = keyModel.highlightLayers.includes('tonic');
  const isDiminished = keyModel.highlightLayers.includes('diminished');

  const width = isWhite ? WHITE_KEY_WIDTH : BLACK_KEY_WIDTH;
  const height = isWhite ? WHITE_KEY_HEIGHT : BLACK_KEY_HEIGHT;
  const length = isWhite ? WHITE_KEY_LENGTH : BLACK_KEY_LENGTH;
  const topY = placement.y + height / 2;

  const labelZ = length / 2 - (isWhite ? 0.62 : 0.46);
  const dotZ = isWhite ? length / 2 - 1.18 : 0.62;
  const markerZ = isWhite ? 0.95 : -0.05;
  const glowColor = isDiminished ? HIGHLIGHT_COLORS.diminished : HIGHLIGHT_COLORS.activeChord;
  const baseColor = isWhite ? SCENE_COLORS.whiteKey : SCENE_COLORS.blackKey;
  // Hover подмешивает янтарь в цвет клавиши: на белой слоновой кости
  // одно лишь свечение (emissive) почти не читается.
  const keyColor =
    chordEmphasis !== null
      ? `#${new Color(baseColor).lerp(new Color(glowColor), CHORD_COLOR_MIX[chordEmphasis]).getHexString()}`
      : hovered
        ? `#${new Color(baseColor)
            .lerp(new Color(HIGHLIGHT_COLORS.activeChord), isWhite ? 0.34 : 0.45)
            .getHexString()}`
        : baseColor;

  useFrame((state) => {
    const material = keyMaterialRef.current;

    if (material === null) {
      return;
    }

    if (chordEmphasis !== null) {
      const base = CHORD_GLOW_INTENSITY[chordEmphasis];
      material.emissiveIntensity =
        motionEnabled && chordEmphasis !== 'echo'
          ? base + Math.sin(state.clock.elapsedTime * 2.6) * 0.07
          : base;
    } else {
      material.emissiveIntensity = hovered ? 0.18 : 0;
    }
  });

  return (
    <group position={[placement.x, 0, placement.z]}>
      <RoundedBox
        args={[width, height, length]}
        radius={isWhite ? 0.035 : 0.07}
        smoothness={4}
        position={[0, placement.y - (pressed ? PRESS_DEPTH : 0), 0]}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelect(keyModel);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          setPressed(true);
        }}
        onPointerUp={() => setPressed(false)}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => {
          setHovered(false);
          setPressed(false);
        }}
      >
        <meshPhysicalMaterial
          ref={keyMaterialRef}
          map={isWhite ? getIvoryTexture() : null}
          color={keyColor}
          roughness={isWhite ? 0.46 : 0.3}
          metalness={0.02}
          clearcoat={isWhite ? 0.35 : 1}
          clearcoatRoughness={isWhite ? 0.3 : 0.12}
          emissive={chordEmphasis !== null ? glowColor : HOVER_GLOW}
          emissiveIntensity={0}
        />
      </RoundedBox>

      {/* Маркер ноты гаммы; тоника — золотая точка на темной подложке, чтобы не сливалась */}
      {inScale ? (
        <group position={[0, topY + 0.008, dotZ]} rotation={[-Math.PI / 2, 0, 0]}>
          {isTonic ? (
            <mesh position={[0, 0, -0.001]}>
              <circleGeometry args={[0.27, 32]} />
              <meshBasicMaterial color="#181006" transparent opacity={0.6} />
            </mesh>
          ) : null}
          <mesh>
            <circleGeometry args={[isTonic ? 0.15 : 0.095, 32]} />
            <meshBasicMaterial
              color={isTonic ? HIGHLIGHT_COLORS.tonic : HIGHLIGHT_COLORS.inScale}
              toneMapped={false}
              transparent
              opacity={isTonic ? 1 : 0.92}
            />
          </mesh>
          {isTonic ? (
            <mesh>
              <ringGeometry args={[0.2, 0.25, 32]} />
              <meshBasicMaterial
                color={HIGHLIGHT_COLORS.tonic}
                toneMapped={false}
                transparent
                opacity={0.9}
              />
            </mesh>
          ) : null}
        </group>
      ) : null}

      {/* Кольцо на тонике активного аккорда — с какой ноты начинать */}
      {chordEmphasis === 'root' ? (
        <mesh position={[0, topY + 0.012, markerZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.13, 0.19, 32]} />
          <meshBasicMaterial color="#fff1da" toneMapped={false} transparent opacity={0.9} />
        </mesh>
      ) : null}

      {keyModel.visibleLabel !== null ? (
        <Text
          position={[0, topY + 0.012, labelZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          font={keyLabelFontUrl}
          fontSize={isWhite ? 0.32 : 0.24}
          color={getLabelColor(isWhite, chordEmphasis)}
          anchorX="center"
          anchorY="middle"
        >
          {keyModel.visibleLabel}
        </Text>
      ) : null}
    </group>
  );
}

/** На золотой подсветке аккорда читается только темная подпись — особенно на черных клавишах. */
function getLabelColor(isWhite: boolean, chordEmphasis: ChordKeyEmphasis | null): string {
  if (chordEmphasis === 'root' || chordEmphasis === 'primary') {
    return '#2a1c0c';
  }

  return isWhite ? '#3f392d' : '#d9d2c2';
}
