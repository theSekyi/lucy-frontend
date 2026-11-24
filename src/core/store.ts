export type Listener<TState> = (state: TState) => void;

export interface ReadableStore<TState> {
  getState: () => TState;
  subscribe: (listener: Listener<TState>) => () => void;
}

export interface Store<TState> extends ReadableStore<TState> {
  update: (updater: (current: TState) => TState) => void;
}

export function createStore<TState>(initialState: TState): Store<TState> {
  let state = initialState;
  const listeners = new Set<Listener<TState>>();

  return {
    getState: () => state,

    update(updater) {
      const nextState = updater(state);
      if (Object.is(nextState, state)) return;
      state = nextState;
      for (const notify of listeners) notify(state);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
