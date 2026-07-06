import { createContext, useContext } from 'react'

interface TutorialContextValue {
  openTutorial: () => void
}

export const TutorialContext = createContext<TutorialContextValue>({ openTutorial: () => {} })
export const useTutorial = (): TutorialContextValue => useContext(TutorialContext)
