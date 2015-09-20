import { StateAndEffect } from './sideEffects';

const REPLAY_HAPPENED = Symbol('replayHappened');

export function enableEffects(applyMiddleware, opts = {}) {
  var DEBUG = opts.debug || true

  return (...middlewares) => {
    return nextStoreEnhancer => (defaultReducer, initialState) => {
      // Here we will collect all actions that need to be runned after original
      // dispatch has runned. In case next dispatch produce aditional effects
      // they will be enqued and performed in order in which they appeared.
      // Listeners will be notified after all effects has been performed.
      let pendingEffects = [];

      let currentReducer = defaultReducer;
      let store;

      function subscribe(listener) { return store.subscribe(listener) }

      function unliftReducer(reducer) {
        return (state, action) => {
          const newState = reducer(state, action);
          if (newState instanceof StateAndEffect) {
            if (!action[REPLAY_HAPPENED]) {
              if (DEBUG) { console.log('adding side effect ', newState.effects); }
              pendingEffects.push(...(newState.effects));
              action[REPLAY_HAPPENED] = true;
            }
            return newState.state;
          }
          return newState;
        };
      }

      function getReducer() {
        return currentReducer;
      }
      function replaceReducer(nextReducer) {
        currentReducer = nextReducer;
        store.replaceReducer(unliftReducer(currentReducer));
      }

      function performSideEffectsMiddleware() { // this function can take {dispatch, getState} as argument
        return next => action => {
          if (DEBUG) { console.log('performSideEffectsMiddleware dispatch happened with:', JSON.stringify(action), action); }
          // we dispatch normaly action to next middleware
          const ret = next(action);
          // after dispatch we check if we have effects to run and if yes than
          // we will dispatch them. That mean that they will go back trough
          // this function
          while (pendingEffects.length > 0) {
            if (DEBUG) { console.log('performSideEffectsMiddleware removing side effect '); }
            next(pendingEffects.shift());
          }

          // we will return same thing to keep compatibility
          return ret;
        };
      }

      store = applyMiddleware(performSideEffectsMiddleware, ...middlewares)(nextStoreEnhancer)(unliftReducer(currentReducer), initialState);


      return {
        ...store,
        subscribe,
        getReducer,
        replaceReducer
      };
    };
  };
}
