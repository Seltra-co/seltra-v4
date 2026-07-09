import { Injectable, NotFoundException } from '@nestjs/common'
import type { MessageEvent } from '@nestjs/common'
import { Observable } from 'rxjs'

export type BuildEvent =
  | { type: 'step'; step: string; status: 'started' | 'completed' | 'failed'; label?: string }
  | { type: 'log'; message: string }
  | { type: 'file'; name: string; status: 'started' | 'completed' | 'failed' }
  | { type: 'chunk'; file: string; content: string }
  | { type: 'preview'; url: string; store?: unknown }
  | { type: 'done'; store?: unknown }
  | { type: 'error'; message: string }

export interface BuildContext {
  buildId: string
  emit: (event: BuildEvent) => void
}

type Subscriber = (event: BuildEvent) => void

interface BuildSession {
  id: string
  status: 'running' | 'done' | 'error'
  currentStep?: string
  startedAt: string
  events: BuildEvent[]
  subscribers: Set<Subscriber>
}

@Injectable()
export class BuildEventsService {
  private readonly sessions = new Map<string, BuildSession>()

  createSession(): BuildContext {
    const buildId = `build_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    this.sessions.set(buildId, {
      id: buildId,
      status: 'running',
      startedAt: new Date().toISOString(),
      events: [],
      subscribers: new Set(),
    })
    return {
      buildId,
      emit: (event) => this.emit(buildId, event),
    }
  }

  emit(buildId: string, event: BuildEvent) {
    const session = this.sessions.get(buildId)
    if (!session) return

    if (event.type === 'step') {
      if (event.status === 'started') session.currentStep = event.step
      if (event.status !== 'started' && session.currentStep === event.step) {
        session.currentStep = undefined
      }
    }

    if (event.type === 'error') {
      session.status = 'error'
      if (session.currentStep) {
        const failedStep: BuildEvent = { type: 'step', step: session.currentStep, status: 'failed' }
        session.events.push(failedStep)
        for (const subscriber of session.subscribers) subscriber(failedStep)
        session.currentStep = undefined
      }
    }

    if (event.type === 'done') session.status = 'done'
    session.events.push(event)
    session.events = session.events.slice(-300)
    for (const subscriber of session.subscribers) subscriber(event)
  }

  stream(buildId: string): Observable<MessageEvent> {
    const session = this.sessions.get(buildId)
    if (!session) throw new NotFoundException(`Build session "${buildId}" not found`)

    return new Observable<MessageEvent>((observer) => {
      const send = (event: BuildEvent) => {
        observer.next({ type: event.type, data: event })
        if (event.type === 'done' || event.type === 'error') observer.complete()
      }

      for (const event of session.events) send(event)
      if (session.status !== 'running') {
        observer.complete()
        return undefined
      }

      session.subscribers.add(send)
      return () => {
        session.subscribers.delete(send)
      }
    })
  }
}
