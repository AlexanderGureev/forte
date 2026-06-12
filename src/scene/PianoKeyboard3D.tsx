import { Text } from '@react-three/drei';
import brandFontUrl from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-500-normal.woff';
import { PianoKey3D, type ChordKeyEmphasis } from './PianoKey3D';
import { getKeyboardWidth, getKeyPlacement } from './geometry';
import { SCENE_COLORS } from './materials';
import { getWoodTexture } from './textures';
import type { KeyboardKeyViewModel, KeyboardViewModel, PhysicalPitchClass } from '../music/types';

export interface PianoKeyboard3DProps {
  readonly viewModel: KeyboardViewModel;
  readonly chordRootPitchClass: PhysicalPitchClass | null;
  readonly motionEnabled: boolean;
  readonly onSelectKey: (key: KeyboardKeyViewModel) => void;
}

export function PianoKeyboard3D({
  viewModel,
  chordRootPitchClass,
  motionEnabled,
  onSelectKey
}: PianoKeyboard3DProps) {
  const keyboardWidth = getKeyboardWidth(viewModel.octaveCount);
  const cheekWidth = 1.15;
  const bodyWidth = keyboardWidth + cheekWidth * 2 + 0.4;
  const cheekX = keyboardWidth / 2 + cheekWidth / 2 + 0.12;
  const chordEmphasisByKeyId = getChordEmphasisByKeyId(viewModel, chordRootPitchClass);
  const woodMap = getWoodTexture();

  return (
    <group>
      {viewModel.keys.map((key) => (
        <PianoKey3D
          key={key.id}
          keyModel={key}
          placement={getKeyPlacement(key, viewModel)}
          motionEnabled={motionEnabled}
          chordEmphasis={chordEmphasisByKeyId.get(key.id) ?? null}
          onSelect={onSelectKey}
        />
      ))}

      {/* Клавиатурное ложе */}
      <mesh position={[0, -0.78, -0.6]} receiveShadow>
        <boxGeometry args={[bodyWidth, 1.56, 8.6]} />
        <meshPhysicalMaterial
          map={woodMap}
          color={SCENE_COLORS.body}
          roughness={0.42}
          metalness={0}
          clearcoat={0.7}
          clearcoatRoughness={0.22}
        />
      </mesh>

      {/* Боковые щеки корпуса */}
      {[-cheekX, cheekX].map((x) => (
        <mesh key={x} position={[x, 0.52, -0.9]} castShadow receiveShadow>
          <boxGeometry args={[cheekWidth, 1.62, 7.6]} />
          <meshPhysicalMaterial
            map={woodMap}
            color={SCENE_COLORS.body}
            roughness={0.4}
            metalness={0}
            clearcoat={0.7}
            clearcoatRoughness={0.2}
          />
        </mesh>
      ))}

      {/* Верхняя панель с брендом: высокая, чтобы световое пятно ложилось целиком */}
      <mesh position={[0, 1.62, -3.62]} castShadow receiveShadow>
        <boxGeometry args={[bodyWidth, 3.4, 0.56]} />
        <meshPhysicalMaterial
          map={woodMap}
          color={SCENE_COLORS.body}
          roughness={0.38}
          metalness={0}
          clearcoat={0.8}
          clearcoatRoughness={0.18}
        />
      </mesh>
      <Text
        position={[0, 2.32, -3.32]}
        font={brandFontUrl}
        fontSize={0.4}
        letterSpacing={0.5}
        color={SCENE_COLORS.brass}
        anchorX="center"
        anchorY="middle"
      >
        FORTE
      </Text>

      {/* Крышка корпуса: слегка выступает вперёд, как у акустического пианино */}
      <mesh position={[0, 3.42, -3.5]} castShadow receiveShadow>
        <boxGeometry args={[bodyWidth + 0.4, 0.2, 1.3]} />
        <meshPhysicalMaterial
          map={woodMap}
          color={SCENE_COLORS.body}
          roughness={0.36}
          metalness={0}
          clearcoat={0.85}
          clearcoatRoughness={0.16}
        />
      </mesh>

      {/* Козырек фальш-панели: накрывает задние концы клавиш мягкой тенью */}
      <mesh position={[0, 1.16, -2.86]} castShadow>
        <boxGeometry args={[bodyWidth, 0.26, 1.1]} />
        <meshPhysicalMaterial
          map={woodMap}
          color={SCENE_COLORS.bodyEdge}
          roughness={0.4}
          metalness={0}
          clearcoat={0.7}
          clearcoatRoughness={0.2}
        />
      </mesh>

      {/* Красный фетр за клавишами */}
      <mesh position={[0, 0.68, -2.94]}>
        <boxGeometry args={[keyboardWidth + 0.24, 0.16, 0.3]} />
        <meshStandardMaterial color={SCENE_COLORS.felt} roughness={0.95} />
      </mesh>

      {/* Латунная кромка перед клавишами */}
      <mesh position={[0, -0.03, 3.56]}>
        <boxGeometry args={[bodyWidth, 0.06, 0.1]} />
        <meshStandardMaterial
          color={SCENE_COLORS.brass}
          roughness={0.38}
          metalness={0.85}
        />
      </mesh>
    </group>
  );
}

/**
 * Выбирает основную позицию аккорда: ноты от тоники аккорда вверх в средней
 * октаве подсвечиваются ярко (root/primary), дубликаты в остальных октавах
 * приглушаются как echo. Опирается только на highlight layers из view model.
 */
function getChordEmphasisByKeyId(
  viewModel: KeyboardViewModel,
  chordRootPitchClass: PhysicalPitchClass | null
): ReadonlyMap<string, ChordKeyEmphasis> {
  const emphasisByKeyId = new Map<string, ChordKeyEmphasis>();
  const chordKeys = viewModel.keys.filter((key) => key.highlightLayers.includes('activeChord'));

  if (chordKeys.length === 0) {
    return emphasisByKeyId;
  }

  for (const key of chordKeys) {
    emphasisByKeyId.set(key.id, 'echo');
  }

  if (chordRootPitchClass === null) {
    return emphasisByKeyId;
  }

  const rootOctave = viewModel.startOctave + (viewModel.octaveCount > 2 ? 1 : 0);

  for (const key of chordKeys) {
    const targetOctave =
      key.physicalPitchClass >= chordRootPitchClass ? rootOctave : rootOctave + 1;

    if (key.octave === targetOctave) {
      emphasisByKeyId.set(
        key.id,
        key.physicalPitchClass === chordRootPitchClass ? 'root' : 'primary'
      );
    }
  }

  return emphasisByKeyId;
}
