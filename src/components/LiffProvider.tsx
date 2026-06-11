'use client'

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'
import { initialLiffState, type LiffState, type LiffAction } from '@/lib/liff'

const LiffContext = createContext<LiffState | undefined>(undefined)

function liffReducer(state: LiffState, action: LiffAction): LiffState {
  switch (action.type) {
    case 'INIT_START':
      return { ...initialLiffState }
    case 'INIT_SUCCESS':
      return {
        isReady: true,
        isLoggedIn: action.payload.isLoggedIn,
        isInClient: action.payload.isInClient,
        profile: action.payload.profile,
        idToken: action.payload.idToken,
        error: null,
      }
    case 'INIT_ERROR':
      return {
        ...initialLiffState,
        isReady: true,
        error: action.payload,
      }
    case 'LOGOUT':
      return { ...initialLiffState, isReady: true }
  }
}

export function LiffProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(liffReducer, initialLiffState)
  const initCalled = useRef(false)

  useEffect(() => {
    if (initCalled.current) return
    initCalled.current = true

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId || liffId === 'YOUR_LIFF_ID') {
      dispatch({ type: 'INIT_ERROR', payload: new Error('LIFF_ID not configured') })
      return
    }

    async function initLiff() {
      try {
        const liff = (await import('@line/liff')).default
        await liff.init({ liffId: liffId! })

        const isLoggedIn = liff.isLoggedIn()
        const isInClient = liff.isInClient()

        let profile = null
        let idToken: string | null = null

        if (isLoggedIn) {
          idToken = liff.getIDToken()
          const liffProfile = await liff.getProfile()
          profile = {
            userId: liffProfile.userId,
            displayName: liffProfile.displayName,
            pictureUrl: liffProfile.pictureUrl,
            statusMessage: liffProfile.statusMessage,
          }
        }

        dispatch({
          type: 'INIT_SUCCESS',
          payload: { isLoggedIn, isInClient, profile, idToken },
        })

        if (isInClient && !isLoggedIn) {
          liff.login()
        }
      } catch (err) {
        dispatch({
          type: 'INIT_ERROR',
          payload: err instanceof Error ? err : new Error('LIFF init failed'),
        })
      }
    }

    initLiff()
  }, [])

  return (
    <LiffContext.Provider value={state}>
      {children}
    </LiffContext.Provider>
  )
}

export function useLiff(): LiffState {
  const ctx = useContext(LiffContext)
  if (ctx === undefined) {
    throw new Error('useLiff must be used within <LiffProvider>')
  }
  return ctx
}
