import { contextBridge, ipcRenderer } from 'electron'
import type { OsintApi } from '../shared/types'

const api: OsintApi = {
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id) => ipcRenderer.invoke('projects:get', id),
    save: (p) => ipcRenderer.invoke('projects:save', p),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
    counts: () => ipcRenderer.invoke('projects:counts'),
    contents: (id) => ipcRenderer.invoke('projects:contents', id)
  },
  personas: {
    list: () => ipcRenderer.invoke('personas:list'),
    get: (id) => ipcRenderer.invoke('personas:get', id),
    save: (p) => ipcRenderer.invoke('personas:save', p),
    remove: (id) => ipcRenderer.invoke('personas:remove', id)
  },
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    get: (id) => ipcRenderer.invoke('notes:get', id),
    save: (n) => ipcRenderer.invoke('notes:save', n),
    remove: (id) => ipcRenderer.invoke('notes:remove', id),
    exportAll: () => ipcRenderer.invoke('notes:exportAll'),
    exportOne: (id) => ipcRenderer.invoke('notes:exportOne', id)
  },
  boards: {
    list: () => ipcRenderer.invoke('boards:list'),
    save: (b) => ipcRenderer.invoke('boards:save', b),
    remove: (id) => ipcRenderer.invoke('boards:remove', id),
    graph: (boardId) => ipcRenderer.invoke('boards:graph', boardId),
    saveNode: (n) => ipcRenderer.invoke('boards:saveNode', n),
    removeNode: (id) => ipcRenderer.invoke('boards:removeNode', id),
    saveEdge: (e) => ipcRenderer.invoke('boards:saveEdge', e),
    removeEdge: (id) => ipcRenderer.invoke('boards:removeEdge', id)
  },
  tools: {
    list: () => ipcRenderer.invoke('tools:list'),
    save: (t) => ipcRenderer.invoke('tools:save', t),
    remove: (id) => ipcRenderer.invoke('tools:remove', id),
    testAll: () => ipcRenderer.invoke('tools:testAll'),
    onTestProgress: (cb) => {
      const listener = (_e: unknown, payload: unknown): void =>
        cb(payload as Parameters<typeof cb>[0])
      ipcRenderer.on('tools:testProgress', listener as never)
      return () => ipcRenderer.removeListener('tools:testProgress', listener as never)
    }
  },
  files: {
    pickImage: (kind) => ipcRenderer.invoke('files:pickImage', kind),
    saveDataUrl: (dataUrl, kind) => ipcRenderer.invoke('files:saveDataUrl', dataUrl, kind)
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },
  net: {
    fetchJson: (url, headers) => ipcRenderer.invoke('net:fetchJson', url, headers)
  },
  apiKeys: {
    test: (id, key) => ipcRenderer.invoke('apikeys:test', id, key)
  },
  app: {
    version: () => ipcRenderer.invoke('app:version')
  },
  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onStatus: (cb) => {
      const listener = (_e: unknown, payload: unknown): void =>
        cb(payload as Parameters<typeof cb>[0])
      ipcRenderer.on('updates:status', listener as never)
      return () => ipcRenderer.removeListener('updates:status', listener as never)
    }
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (s) => ipcRenderer.invoke('settings:set', s),
    pickVault: () => ipcRenderer.invoke('settings:pickVault')
  }
}

contextBridge.exposeInMainWorld('api', api)
