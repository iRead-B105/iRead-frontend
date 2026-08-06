import { defineComponent, h, type PropType } from 'vue'
import type {
  EditableLessonMaterialItem,
  LessonMaterialFieldError,
  LessonMaterialEditorCode,
  LessonMaterialValidationIssue,
} from '@/features/teacher/training'
import BehaviorMaterialEditor from './BehaviorMaterialEditor.vue'

type UpdateField = (section: 'content' | 'answer', key: string, value: unknown) => void

function createMaterialEditor(name: string, editorCode: LessonMaterialEditorCode) {
  return defineComponent({
    name,
    props: {
      material: {
        type: Object as PropType<EditableLessonMaterialItem>,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      fieldErrors: {
        type: Array as PropType<readonly LessonMaterialFieldError[]>,
        default: () => [],
      },
      validationIssues: {
        type: Array as PropType<readonly LessonMaterialValidationIssue[]>,
        default: () => [],
      },
    },
    emits: {
      updateField: (section: 'content' | 'answer', key: string, _value: unknown) =>
        (section === 'content' || section === 'answer') && Boolean(key),
      editorError: (_message: string | null) => true,
    },
    setup(props, { emit }) {
      const onUpdateField: UpdateField = (section, key, value) => {
        emit('updateField', section, key, value)
      }
      const onEditorError = (message: string | null) => {
        emit('editorError', message)
      }
      return () =>
        h(BehaviorMaterialEditor, {
          material: props.material,
          editorCode,
          disabled: props.disabled,
          fieldErrors: props.fieldErrors,
          validationIssues: props.validationIssues,
          onUpdateField,
          onEditorError,
        })
    },
  })
}

export const TraceMaterialEditor = createMaterialEditor('TraceMaterialEditor', 'E01')
export const AudioLetterChoiceMaterialEditor = createMaterialEditor(
  'AudioLetterChoiceMaterialEditor',
  'E02',
)
export const ListenAndSelectMaterialEditor = createMaterialEditor(
  'ListenAndSelectMaterialEditor',
  'E03',
)
export const SimilarSoundChoiceMaterialEditor = createMaterialEditor(
  'SimilarSoundChoiceMaterialEditor',
  'E04',
)
export const SoundManipulationMaterialEditor = createMaterialEditor(
  'SoundManipulationMaterialEditor',
  'E05',
)
export const SoundBlendMaterialEditor = createMaterialEditor('SoundBlendMaterialEditor', 'E06')
export const LetterBuildMaterialEditor = createMaterialEditor('LetterBuildMaterialEditor', 'E07')
export const WordReadingMaterialEditor = createMaterialEditor('WordReadingMaterialEditor', 'E08')
export const SentenceReadingMaterialEditor = createMaterialEditor(
  'SentenceReadingMaterialEditor',
  'E09',
)
export const ReadAloudMaterialEditor = createMaterialEditor('ReadAloudMaterialEditor', 'E10')
export const SentenceAssemblyMaterialEditor = createMaterialEditor(
  'SentenceAssemblyMaterialEditor',
  'E11',
)
export const FillBlankMaterialEditor = createMaterialEditor('FillBlankMaterialEditor', 'E12')
export const ImageSentenceMatchMaterialEditor = createMaterialEditor(
  'ImageSentenceMatchMaterialEditor',
  'E13',
)
