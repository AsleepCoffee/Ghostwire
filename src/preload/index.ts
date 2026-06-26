import { contextBridge, ipcRenderer } from 'electron'
import type { OsintApi } from '../shared/types'

const api: OsintApi = {
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id) => ipcRenderer.invoke('projects:get', id),
    save: (p) => ipcRenderer.invoke('projects:save', p),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
    counts: () => ipcRenderer.invoke('projects:counts'),
    contents: (id) => ipcRenderer.invoke('projects:contents', id),
    exportReport: (id) => ipcRenderer.invoke('projects:exportReport', id),
    exportReportHtml: (id) => ipcRenderer.invoke('projects:exportReportHtml', id),
    exportReportPdf: (id) => ipcRenderer.invoke('projects:exportReportPdf', id),
    exportReportDocx: (id) => ipcRenderer.invoke('projects:exportReportDocx', id)
  },
  evidence: {
    capture: (payload) => ipcRenderer.invoke('evidence:capture', payload),
    list: (projectId) => ipcRenderer.invoke('evidence:list', projectId),
    remove: (id) => ipcRenderer.invoke('evidence:remove', id),
    setNote: (id, note) => ipcRenderer.invoke('evidence:setNote', id, note),
    setOcr: (id, ocr) => ipcRenderer.invoke('evidence:setOcr', id, ocr),
    ocr: (id) => ipcRenderer.invoke('evidence:ocr', id),
    verify: (id) => ipcRenderer.invoke('evidence:verify', id),
    fromUrl: (url, projectId) => ipcRenderer.invoke('evidence:fromUrl', url, projectId),
    setGeo: (id, lat, lng, label) => ipcRenderer.invoke('evidence:setGeo', id, lat, lng, label),
    copyImage: (id) => ipcRenderer.invoke('evidence:copyImage', id)
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
    saveDataUrl: (dataUrl, kind) => ipcRenderer.invoke('files:saveDataUrl', dataUrl, kind),
    fetchImage: (url, kind) => ipcRenderer.invoke('files:fetchImage', url, kind),
    randomAvatar: () => ipcRenderer.invoke('files:randomAvatar'),
    saveCopy: (mediaUrl, defaultName) => ipcRenderer.invoke('files:saveCopy', mediaUrl, defaultName),
    exif: (mediaUrl) => ipcRenderer.invoke('files:exif', mediaUrl),
    dataUrl: (mediaUrl) => ipcRenderer.invoke('files:dataUrl', mediaUrl),
    exportImage: (dataUrl, defaultName) => ipcRenderer.invoke('files:exportImage', dataUrl, defaultName)
  },
  activity: {
    log: (projectId, type, message) => ipcRenderer.invoke('activity:log', projectId, type, message),
    list: (projectId) => ipcRenderer.invoke('activity:list', projectId)
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },
  browser: {
    onOpen: (cb) => {
      const listener = (_e: unknown, urls: string[]): void => cb(urls)
      ipcRenderer.on('browser:open', listener as never)
      return () => ipcRenderer.removeListener('browser:open', listener as never)
    }
  },
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:write', text),
    writeImage: (dataUrl) => ipcRenderer.invoke('clipboard:writeImage', dataUrl)
  },
  net: {
    fetchJson: (url, headers) => ipcRenderer.invoke('net:fetchJson', url, headers),
    httpStatus: (url) => ipcRenderer.invoke('net:httpStatus', url)
  },
  mail: {
    create: (localPart) => ipcRenderer.invoke('mail:create', localPart),
    messages: (token, base) => ipcRenderer.invoke('mail:messages', token, base),
    message: (token, id, base) => ipcRenderer.invoke('mail:message', token, id, base)
  },
  apiKeys: {
    test: (id, key) => ipcRenderer.invoke('apikeys:test', id, key)
  },
  intel: {
    gravatar: (email) => ipcRenderer.invoke('intel:gravatar', email),
    hibp: (email, key) => ipcRenderer.invoke('intel:hibp', email, key),
    geolocate: (evidenceId) => ipcRenderer.invoke('intel:geolocate', evidenceId),
    hunterDomain: (query, key) => ipcRenderer.invoke('intel:hunterDomain', query, key),
    verifyEmail: (email, key) => ipcRenderer.invoke('intel:verifyEmail', email, key),
    leakcheck: (query) => ipcRenderer.invoke('intel:leakcheck', query),
    hudsonrock: (email) => ipcRenderer.invoke('intel:hudsonrock', email),
    facebookId: (input) => ipcRenderer.invoke('intel:facebookId', input),
    instagramId: (input) => ipcRenderer.invoke('intel:instagramId', input),
    shodan: (target, key) => ipcRenderer.invoke('intel:shodan', target, key),
    wigle: (query, kind, key) => ipcRenderer.invoke('intel:wigle', query, kind, key)
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    encryptionStatus: () => ipcRenderer.invoke('app:encryptionStatus')
  },
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    toggleMaximize: () => ipcRenderer.send('win:toggleMaximize'),
    close: () => ipcRenderer.send('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:isMaximized'),
    onMaximizeChange: (cb) => {
      const listener = (_e: unknown, v: boolean): void => cb(v)
      ipcRenderer.on('win:maximized', listener as never)
      return () => ipcRenderer.removeListener('win:maximized', listener as never)
    }
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
  },
  vpn: {
    state: () => ipcRenderer.invoke('vpn:state'),
    import: () => ipcRenderer.invoke('vpn:import'),
    rename: (id, name) => ipcRenderer.invoke('vpn:rename', id, name),
    remove: (id) => ipcRenderer.invoke('vpn:remove', id),
    start: (id) => ipcRenderer.invoke('vpn:start', id),
    stop: (id) => ipcRenderer.invoke('vpn:stop', id),
    startAll: () => ipcRenderer.invoke('vpn:startAll'),
    apply: () => ipcRenderer.invoke('vpn:apply'),
    installEngine: () => ipcRenderer.invoke('vpn:installEngine'),
    onStatus: (cb) => {
      const listener = (_e: unknown, payload: unknown): void => cb(payload as Parameters<typeof cb>[0])
      ipcRenderer.on('vpn:status', listener as never)
      return () => ipcRenderer.removeListener('vpn:status', listener as never)
    }
  },
  backup: {
    run: () => ipcRenderer.invoke('backup:run'),
    list: () => ipcRenderer.invoke('backup:list'),
    pickFolder: () => ipcRenderer.invoke('backup:pickFolder'),
    reveal: (path) => ipcRenderer.invoke('backup:reveal', path),
    restore: (path) => ipcRenderer.invoke('backup:restore', path),
    exportPack: () => ipcRenderer.invoke('backup:exportPack'),
    importPack: (path) => ipcRenderer.invoke('backup:importPack', path)
  }
}

contextBridge.exposeInMainWorld('api', api)
