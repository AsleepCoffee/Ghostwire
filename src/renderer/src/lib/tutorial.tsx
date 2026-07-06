import { createContext, useContext } from 'react'

interface TutorialContextValue {
  openTutorial: () => void
  tutorialActive: boolean
}

export const TutorialContext = createContext<TutorialContextValue>({ openTutorial: () => {}, tutorialActive: false })
export const useTutorial = (): TutorialContextValue => useContext(TutorialContext)
