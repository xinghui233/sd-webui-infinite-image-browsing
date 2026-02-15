
import { ExtraPathType, addExtraPath, aliasExtraPath, removeExtraPath } from '@/api/db'
import { globalEvents } from '@/util'
import { Input, Modal, RadioButton, RadioGroup, message, Button } from 'ant-design-vue'
import { open } from '@tauri-apps/api/dialog'
import { checkPathExists } from '@/api'
import { h, ref } from 'vue'
import { t } from '@/i18n'
import { useGlobalStore } from '@/store/useGlobalStore'
import { isTauri } from '@/util/env'
import NumInput from '@/components/numInput.vue'
import * as Path from '@/util/path'



export const addToExtraPath = async (initType: ExtraPathType, initPath?: string) => {
  const g = useGlobalStore()
  const path = ref(initPath ?? '')
  type ExtraPathModeOption = ExtraPathType | 'normale_walk'
  const mapModeToExtraTypes = (mode: ExtraPathModeOption): ExtraPathType[] => {
    if (mode === 'normale_walk') {
      return ['scanned', 'walk']
    }
    return [mode]
  }

  const type = ref<ExtraPathModeOption>(initType)
  const normalWalkStartDepth = ref(Math.max(1, Number(g.normalWalkStartDepthMap[Path.normalize(initPath ?? '')] ?? 1)))
  const openToSelectPath = async () => {
    const ret = await open({ directory: true, defaultPath: initPath })
    if (typeof ret === 'string') {
      path.value = ret
    } else {
      return
    }
  }
  path.value = await new Promise<string>((resolve) => {
    Modal.confirm({
      title: t('inputTargetFolderPath'),
      width: '800px',
      content: () => {
        return h('div', [
          g.conf?.enable_access_control ? h('a', {
            style: {
              'word-break': 'break-all',
              'margin-bottom': '4px',
              display: 'block'
            },
            target: '_blank',
            href: 'https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/518'
          }, 'Please open this link first (Access Control mode only)') : '',
          isTauri ? h(Button, { onClick: openToSelectPath, style: {  margin: '4px 0' } } , t('selectFolder') ): '',
          h(Input, {
            value: path.value,
            'onUpdate:value': (v: string) => (path.value = v)
          }),
          h('div', [
            h('span', t('type')+': '),
            h(RadioGroup, {
              value: type.value,
              'onUpdate:value': (v: ExtraPathModeOption) => (type.value = v),
              buttonStyle: 'solid',
              style: { margin: '16px 0 32px' }
            }, [
              h(RadioButton, { value: 'walk' }, 'Walk'),
              h(RadioButton, { value: 'scanned' }, 'Normal'),
              h(RadioButton, { value: 'scanned-fixed' }, 'Fixed'),
              h(RadioButton, { value: 'normale_walk' }, 'Normal+Walk')
            ])
          ]),
          h('p', 'Walk: '+ t('walkModeDoc')),
          h('p', 'Normal: '+ t('normalModelDoc')),
          h('p', 'Fixed: '+ t('fixedModeDoc')),
          h('p', 'Normal+Walk: '+ t('normalWalkModeDoc')),
          type.value === 'normale_walk'
            ? h('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px'
              }
            }, [
              h('span', t('normalWalkStartDepth') + ': '),
              h(NumInput as any, {
                min: 1,
                max: 32,
                step: 1,
                modelValue: normalWalkStartDepth.value,
                'onUpdate:modelValue': (v: number) => {
                  normalWalkStartDepth.value = Math.max(1, Math.floor(v || 1))
                }
              })
            ])
            : null
        ])
      },
      async onOk () {
        if (!path.value) {
          message.error(t('pathIsEmpty'))
          throw new Error('pathIsEmpty')
        }
        const res = await checkPathExists([path.value])
        if (res[path.value]) {
          resolve(path.value)
        } else {
          message.error(t('pathDoesNotExist'))
        }
      }
    })
  })
  Modal.confirm({
    content: t('confirmToAddToExtraPath'),
    async onOk () {
      await addExtraPath({ types: mapModeToExtraTypes(type.value), path: path.value })
      const normalizedPath = Path.normalize(path.value)
      if (type.value === 'normale_walk') {
        g.normalWalkStartDepthMap[normalizedPath] = Math.max(1, Math.floor(normalWalkStartDepth.value || 1))
      }
      message.success(t('addCompleted'))
      globalEvents.emit('searchIndexExpired')
      globalEvents.emit('updateGlobalSetting')
    }
  })
}

export const onRemoveExtraPathClick = (path: string, type: ExtraPathType | ExtraPathType[]) => {
  const g = useGlobalStore()
  const types = Array.isArray(type) ? type : [type]
  Modal.confirm({
    content: t('confirmDelete'),
    closable: true,
    async onOk () {
      await removeExtraPath({ types, path })
      if (types.includes('walk') && types.includes('scanned')) {
        delete g.normalWalkStartDepthMap[Path.normalize(path)]
      }
      message.success(t('removeCompleted'))
      globalEvents.emit('searchIndexExpired')
      globalEvents.emit('updateGlobalSetting')
    }
  })
}

export const onAliasExtraPathClick = (path: string) => {
  const alias = ref('')
  Modal.confirm({
    title: t('inputAlias'),
    content: () => {
      return h('div', [
        h('div', {
          style: {
            'word-break': 'break-all',
            'margin-bottom': '4px'
          }
        }, 'Path: ' + path),
        h(Input, {
          value: alias.value,
          'onUpdate:value': (v: string) => (alias.value = v)
        })]
      )
    },
    async onOk () {
      await aliasExtraPath({ alias: alias.value, path })
      message.success(t('addAliasCompleted'))
      globalEvents.emit('updateGlobalSetting')
    }
  })
}
