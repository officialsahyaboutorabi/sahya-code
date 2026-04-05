export type Observer<T> = {
  next: (value: T) => void
  error?: (err: any) => void
  complete?: () => void
}

export type Subscription = {
  unsubscribe: () => void
}

export class Observable<T> {
  protected observers: Observer<T>[] = []

  subscribe(observer: Observer<T>): Subscription {
    this.observers.push(observer)
    return {
      unsubscribe: () => {
        const index = this.observers.indexOf(observer)
        if (index !== -1) {
          this.observers.splice(index, 1)
        }
      },
    }
  }

  pipe<R>(...operators: Array<(source: Observable<any>) => Observable<any>>): Observable<R> {
    return operators.reduce((source, operator) => operator(source), this as any) as Observable<R>
  }
}

export class Subject<T> extends Observable<T> {
  private isClosed = false
  private hasError = false
  private errorValue?: any

  next(value: T): void {
    if (this.isClosed || this.hasError) return
    for (const observer of [...this.observers]) {
      try {
        observer.next(value)
      } catch (err) {
        this.handleError(err, observer)
      }
    }
  }

  error(err: any): void {
    if (this.isClosed || this.hasError) return
    this.hasError = true
    this.errorValue = err
    for (const observer of [...this.observers]) {
      if (observer.error) {
        try {
          observer.error(err)
        } catch {
          // Ignore errors in error handlers
        }
      }
    }
    this.observers = []
  }

  complete(): void {
    if (this.isClosed || this.hasError) return
    this.isClosed = true
    for (const observer of [...this.observers]) {
      if (observer.complete) {
        try {
          observer.complete()
        } catch {
          // Ignore errors in complete handlers
        }
      }
    }
    this.observers = []
  }

  private handleError(err: any, observer: Observer<T>): void {
    if (observer.error) {
      try {
        observer.error(err)
      } catch {
        // Ignore nested errors
      }
    }
  }
}

export function filter<T>(predicate: (value: T) => boolean) {
  return (source: Observable<T>): Observable<T> => {
    const result = new Observable<T>()
    source.subscribe({
      next: (value) => {
        if (predicate(value)) {
          result.observers.forEach((obs) => obs.next(value))
        }
      },
      error: (err) => result.observers.forEach((obs) => obs.error?.(err)),
      complete: () => result.observers.forEach((obs) => obs.complete?.()),
    })
    return result
  }
}

export function map<T, R>(transform: (value: T) => R) {
  return (source: Observable<T>): Observable<R> => {
    const result = new Observable<R>()
    source.subscribe({
      next: (value) => {
        try {
          const mapped = transform(value)
          result.observers.forEach((obs) => obs.next(mapped))
        } catch (err) {
          result.observers.forEach((obs) => obs.error?.(err))
        }
      },
      error: (err) => result.observers.forEach((obs) => obs.error?.(err)),
      complete: () => result.observers.forEach((obs) => obs.complete?.()),
    })
    return result
  }
}

export function distinctUntilChanged<T>(compare?: (a: T, b: T) => boolean) {
  return (source: Observable<T>): Observable<T> => {
    const result = new Observable<T>()
    let lastValue: T | undefined
    let hasValue = false
    source.subscribe({
      next: (value) => {
        if (!hasValue || (compare ? !compare(lastValue!, value) : lastValue !== value)) {
          lastValue = value
          hasValue = true
          result.observers.forEach((obs) => obs.next(value))
        }
      },
      error: (err) => result.observers.forEach((obs) => obs.error?.(err)),
      complete: () => result.observers.forEach((obs) => obs.complete?.()),
    })
    return result
  }
}

export function throttleTime<T>(ms: number) {
  return (source: Observable<T>): Observable<T> => {
    const result = new Observable<T>()
    let lastEmit = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let lastValue: T | undefined

    source.subscribe({
      next: (value) => {
        lastValue = value
        const now = Date.now()
        if (now - lastEmit >= ms) {
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          lastEmit = now
          result.observers.forEach((obs) => obs.next(value))
        } else if (!timeoutId) {
          timeoutId = setTimeout(() => {
            lastEmit = Date.now()
            timeoutId = null
            if (lastValue !== undefined) {
              result.observers.forEach((obs) => obs.next(lastValue!))
            }
          }, ms - (now - lastEmit))
        }
      },
      error: (err) => result.observers.forEach((obs) => obs.error?.(err)),
      complete: () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        result.observers.forEach((obs) => obs.complete?.())
      },
    })
    return result
  }
}

export function bufferTime<T>(ms: number) {
  return (source: Observable<T>): Observable<T[]> => {
    const result = new Observable<T[]>()
    let buffer: T[] = []
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const flush = () => {
      if (buffer.length > 0) {
        result.observers.forEach((obs) => obs.next([...buffer]))
        buffer = []
      }
      timeoutId = null
    }

    source.subscribe({
      next: (value) => {
        buffer.push(value)
        if (!timeoutId) {
          timeoutId = setTimeout(flush, ms)
        }
      },
      error: (err) => result.observers.forEach((obs) => obs.error?.(err)),
      complete: () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        flush()
        result.observers.forEach((obs) => obs.complete?.())
      },
    })
    return result
  }
}
