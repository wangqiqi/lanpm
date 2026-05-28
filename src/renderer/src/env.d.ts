declare global {
  interface Window {
    lanpm: {
      platform: NodeJS.Platform
      versions: {
        node: string
        chrome: string
        electron: string
      }
    }
  }
}

export {}
