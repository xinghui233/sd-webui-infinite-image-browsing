import type { FileTransferTabPane, useGlobalStore } from './store/useGlobalStore'
import { Dict, removeQueryParams, switch2IIB } from './util'
import { uniqueId } from 'lodash-es'
import * as Path from './util/path'

export const resolveQueryActions = async (g: ReturnType<typeof useGlobalStore>) => {
  const paths = g.conf?.global_setting
  const params = new URLSearchParams(parent.location.search)
  switch (params.get('action')) {
    case 'open': {
      let path = params.get('path')

      if (!path || !paths) return
      const map: Dict<string> = {
        extra: paths.outdir_extras_samples,
        save: paths.outdir_save,
        txt2img: paths.outdir_txt2img_samples,
        img2img: paths.outdir_img2img_samples
      }
      if (map[path]) {
        path = map[path]
      }
      const tab = g.tabList[0]
      const mode = params.get('mode') as FileTransferTabPane['mode']
      const paneMode = (['scanned', 'walk', 'scanned-fixed', 'normale_walk'] as const).includes(mode || 'scanned') ? mode : 'scanned'
      const depthParam = Number(params.get('normalWalkStartDepth') ?? params.get('walkDepth') ?? '')
      const normalWalkStartDepth = paneMode === 'normale_walk'
        ? Math.max(1, Number.isFinite(depthParam) && depthParam > 0 ? depthParam : Number(g.normalWalkStartDepthMap[Path.normalize(path)] ?? 1))
        : undefined
      const pane: FileTransferTabPane = {
        type: 'local',
        path,
        key: uniqueId(),
        name: '',
        mode: paneMode,
        normalWalkBasePath: paneMode === 'normale_walk' ? path : undefined,
        normalWalkStartDepth
      }
      tab.panes.unshift(pane)
      tab.key = pane.key
      switch2IIB()
      removeQueryParams(['action', 'path', 'mode', 'normalWalkStartDepth', 'walkDepth'])
      break
    }
  }
}
