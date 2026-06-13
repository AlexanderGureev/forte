import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text, useCursor } from "@react-three/drei";
import { Color, type MeshPhysicalMaterial } from "three";
import keyLabelFontUrl from "@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff";
import {
  BLACK_KEY_HEIGHT,
  BLACK_KEY_LENGTH,
  BLACK_KEY_WIDTH,
  WHITE_KEY_HEIGHT,
  WHITE_KEY_LENGTH,
  WHITE_KEY_WIDTH,
  type KeyPlacement,
} from "./geometry";
import { HIGHLIGHT_COLORS, SCENE_COLORS } from "./materials";
import { getIvoryTexture } from "./textures";
import type { KeyboardKeyViewModel } from "../music/types";

/**
 * Подсветка позиции аккорда:
 * root/primary — рекомендуемая позиция для игры (root — с какой ноты начинать),
 * echo — те же ноты в остальных октавах, приглушены.
 */
export type ChordKeyEmphasis = "root" | "primary" | "echo";

export interface PianoKey3DProps {
  readonly keyModel: KeyboardKeyViewModel;
  readonly placement: KeyPlacement;
  readonly motionEnabled: boolean;
  /** Приглушать клавиши вне тональности, чтобы ноты гаммы читались легче. */
  readonly dimOutOfScale: boolean;
  readonly chordEmphasis: ChordKeyEmphasis | null;
  readonly onSelect: (key: KeyboardKeyViewModel) => void;
}

/** Аккордная нота светится изнутри клавиши, а не плитой поверх неё. */
const CHORD_GLOW_INTENSITY: Record<
  ChordKeyEmphasis,
  { readonly white: number; readonly black: number }
> = {
  root: { white: 0.62, black: 0.32 },
  primary: { white: 0.52, black: 0.24 },
  echo: { white: 0.06, black: 0 },
};

/** Доля цвета аккорда, подмешиваемая в базовый цвет клавиши. */
const CHORD_COLOR_MIX: Record<
  ChordKeyEmphasis,
  { readonly white: number; readonly black: number }
> = {
  root: { white: 0.84, black: 0.62 },
  primary: { white: 0.74, black: 0.52 },
  echo: { white: 0.32, black: 0.16 },
};

const HOVER_GLOW = new Color("#ffe7bd");
const PRESS_DEPTH = 0.07;
const MIDI_GLOW_INTENSITY = 0.64;
const SCALE_KEY_COLOR_MIX = { white: 0.1, black: 0 } as const;
// Клавиши вне тональности уводим в холодный темный тон и делаем прозрачнее,
// чтобы они отступали на задний план и не конкурировали с нотами гаммы.
const MUTED_KEY_TINT = { white: "#565a64", black: "#050507" } as const;
const MUTED_KEY_COLOR_MIX = { white: 0.52, black: 0.6 } as const;
const MUTED_KEY_OPACITY = { white: 0.72, black: 0.9 } as const;

export function PianoKey3D({
  keyModel,
  placement,
  motionEnabled,
  dimOutOfScale,
  chordEmphasis,
  onSelect,
}: PianoKey3DProps) {
  const keyMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  useCursor(hovered);

  const isWhite = keyModel.isWhiteKey;
  const inScale = keyModel.highlightLayers.includes("inScale");
  const isTonic = keyModel.highlightLayers.includes("tonic");
  const isDiminished = keyModel.highlightLayers.includes("diminished");
  const midiPressed = keyModel.highlightLayers.includes("midiPressed");
  const keyPressed = pressed || midiPressed;
  const chordMaterialEmphasis = midiPressed ? null : chordEmphasis;
  const mutedNonScale =
    dimOutOfScale &&
    !inScale &&
    !hovered &&
    !midiPressed &&
    chordMaterialEmphasis === null;

  const width = isWhite ? WHITE_KEY_WIDTH : BLACK_KEY_WIDTH;
  const height = isWhite ? WHITE_KEY_HEIGHT : BLACK_KEY_HEIGHT;
  const length = isWhite ? WHITE_KEY_LENGTH : BLACK_KEY_LENGTH;
  const topY = placement.y + height / 2;

  const labelZ = length / 2 - (isWhite ? 0.62 : 0.46);
  const dotZ = isWhite ? length / 2 - 1.18 : 0.62;
  const hasFingeringBadge = keyModel.fingeringLabel !== null;
  const markerZ = isWhite ? 0.95 : -0.05;
  const fingeringBadge = getFingeringBadgeColors(chordMaterialEmphasis);
  const glowColor = midiPressed
    ? HIGHLIGHT_COLORS.midiPressed
    : isDiminished
      ? HIGHLIGHT_COLORS.diminished
      : HIGHLIGHT_COLORS.activeChord;
  const baseColor = isWhite ? SCENE_COLORS.whiteKey : SCENE_COLORS.blackKey;
  // Hover подмешивает янтарь в цвет клавиши: на белой слоновой кости
  // одно лишь свечение (emissive) почти не читается.
  const keyColor = midiPressed
    ? `#${new Color(baseColor)
        .lerp(new Color(HIGHLIGHT_COLORS.midiPressed), isWhite ? 0.56 : 0.72)
        .getHexString()}`
    : chordMaterialEmphasis !== null
      ? `#${new Color(baseColor)
          .lerp(
            new Color(glowColor),
            getChordColorMix(chordMaterialEmphasis, isWhite),
          )
          .getHexString()}`
      : hovered
        ? `#${new Color(baseColor)
            .lerp(
              new Color(HIGHLIGHT_COLORS.activeChord),
              isWhite ? 0.34 : 0.45,
            )
            .getHexString()}`
        : getIdleKeyColor(baseColor, isWhite, inScale, mutedNonScale);
  const materialRoughness = mutedNonScale
    ? isWhite
      ? 0.74
      : 0.56
    : isWhite
      ? 0.46
      : 0.3;
  const materialClearcoat = mutedNonScale
    ? isWhite
      ? 0.08
      : 0.24
    : isWhite
      ? 0.35
      : 1;
  const materialClearcoatRoughness = mutedNonScale
    ? 0.72
    : isWhite
      ? 0.3
      : 0.12;
  const materialOpacity = mutedNonScale ? getMutedKeyOpacity(isWhite) : 1;

  useFrame((state) => {
    const material = keyMaterialRef.current;

    if (material === null) {
      return;
    }

    if (midiPressed) {
      material.emissiveIntensity = hovered
        ? MIDI_GLOW_INTENSITY + 0.1
        : MIDI_GLOW_INTENSITY;
    } else if (chordMaterialEmphasis !== null) {
      const base = getChordGlowIntensity(chordMaterialEmphasis, isWhite);
      material.emissiveIntensity =
        motionEnabled && chordMaterialEmphasis !== "echo"
          ? base + Math.sin(state.clock.elapsedTime * 2.6) * base * 0.13
          : base;
    } else {
      material.emissiveIntensity = hovered ? (inScale ? 0.2 : 0.08) : 0;
    }
  });

  return (
    <group position={[placement.x, 0, placement.z]}>
      <RoundedBox
        args={[width, height, length]}
        radius={isWhite ? 0.035 : 0.07}
        smoothness={4}
        position={[0, placement.y - (keyPressed ? PRESS_DEPTH : 0), 0]}
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
          map={isWhite && !mutedNonScale ? getIvoryTexture() : null}
          color={keyColor}
          roughness={materialRoughness}
          metalness={0.02}
          clearcoat={materialClearcoat}
          clearcoatRoughness={materialClearcoatRoughness}
          emissive={
            midiPressed || chordMaterialEmphasis !== null
              ? glowColor
              : HOVER_GLOW
          }
          emissiveIntensity={0}
          transparent={mutedNonScale}
          opacity={materialOpacity}
        />
      </RoundedBox>

      {/* Маркер ноты гаммы; тоника — золотая точка на темной подложке, чтобы не сливалась.
          Когда показана аппликатура, маркер заменяет бейдж с номером пальца. */}
      {inScale && !hasFingeringBadge ? (
        <group
          position={[0, topY + 0.008, dotZ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {isTonic ? (
            <mesh position={[0, 0, -0.001]}>
              <circleGeometry args={[0.27, 32]} />
              <meshBasicMaterial color="#181006" transparent opacity={0.6} />
            </mesh>
          ) : null}
          <mesh>
            <circleGeometry args={[isTonic ? 0.15 : 0.115, 32]} />
            <meshBasicMaterial
              color={
                isTonic ? HIGHLIGHT_COLORS.tonic : HIGHLIGHT_COLORS.inScale
              }
              toneMapped={false}
              transparent
              opacity={1}
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
      {chordEmphasis === "root" ? (
        <mesh
          position={[0, topY + 0.012, markerZ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.13, 0.19, 32]} />
          <meshBasicMaterial
            color="#fff1da"
            toneMapped={false}
            transparent
            opacity={0.9}
          />
        </mesh>
      ) : null}

      {keyModel.visibleLabel !== null ? (
        <Text
          position={[0, topY + 0.012, labelZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          font={keyLabelFontUrl}
          fontSize={isWhite ? 0.32 : 0.24}
          color={getLabelColor(
            isWhite,
            chordMaterialEmphasis,
            midiPressed,
            mutedNonScale,
          )}
          anchorX="center"
          anchorY="middle"
        >
          {keyModel.visibleLabel}
        </Text>
      ) : null}

      {keyModel.fingeringLabel !== null ? (
        <group
          position={[0, topY + 0.016, dotZ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {isTonic ? (
            <mesh>
              <ringGeometry
                args={[isWhite ? 0.21 : 0.18, isWhite ? 0.26 : 0.23, 32]}
              />
              <meshBasicMaterial
                color={HIGHLIGHT_COLORS.tonic}
                toneMapped={false}
                transparent
                opacity={0.9}
              />
            </mesh>
          ) : null}
          <mesh>
            <circleGeometry args={[isWhite ? 0.16 : 0.13, 32]} />
            <meshBasicMaterial
              color={fingeringBadge.background}
              toneMapped={false}
            />
          </mesh>
          <Text
            position={[0, 0, 0.002]}
            font={keyLabelFontUrl}
            fontSize={isWhite ? 0.2 : 0.16}
            color={fingeringBadge.digit}
            anchorX="center"
            anchorY="middle"
          >
            {keyModel.fingeringLabel}
          </Text>
        </group>
      ) : null}
    </group>
  );
}

function getChordColorMix(
  chordEmphasis: ChordKeyEmphasis,
  isWhite: boolean,
): number {
  const surface = isWhite ? "white" : "black";

  return CHORD_COLOR_MIX[chordEmphasis][surface];
}

function getChordGlowIntensity(
  chordEmphasis: ChordKeyEmphasis,
  isWhite: boolean,
): number {
  const surface = isWhite ? "white" : "black";

  return CHORD_GLOW_INTENSITY[chordEmphasis][surface];
}

function getIdleKeyColor(
  baseColor: string,
  isWhite: boolean,
  inScale: boolean,
  muted: boolean,
): string {
  const surface = isWhite ? "white" : "black";

  if (inScale) {
    return `#${new Color(baseColor)
      .lerp(new Color(HIGHLIGHT_COLORS.inScale), SCALE_KEY_COLOR_MIX[surface])
      .getHexString()}`;
  }

  if (!muted) {
    return baseColor;
  }

  return `#${new Color(baseColor)
    .lerp(new Color(MUTED_KEY_TINT[surface]), MUTED_KEY_COLOR_MIX[surface])
    .getHexString()}`;
}

function getMutedKeyOpacity(isWhite: boolean): number {
  const surface = isWhite ? "white" : "black";

  return MUTED_KEY_OPACITY[surface];
}

/** На золотой подсветке аккорда читается только темная подпись — особенно на черных клавишах. */
function getLabelColor(
  isWhite: boolean,
  chordEmphasis: ChordKeyEmphasis | null,
  midiPressed: boolean,
  muted: boolean,
): string {
  if (midiPressed) {
    return "#092636";
  }

  if (chordEmphasis === "root" || chordEmphasis === "primary") {
    return "#2a1c0c";
  }

  if (muted) {
    return isWhite ? "#6f6a61" : "#6c675d";
  }

  return isWhite ? "#3f392d" : "#d9d2c2";
}

/** На золотой подсветке аккорда золотой бейдж сливается с клавишей — инвертируем цвета. */
function getFingeringBadgeColors(chordEmphasis: ChordKeyEmphasis | null): {
  background: string;
  digit: string;
} {
  if (chordEmphasis === "root" || chordEmphasis === "primary") {
    return { background: "#2a1708", digit: "#ffe9c2" };
  }

  return { background: "#e0aa5c", digit: "#241608" };
}
