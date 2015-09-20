
export function StateAndEffect(state, ...effects) {
  this.effects = effects;
  this.state = state;
}

export function withEffect(state, ...effects) {
  if (state instanceof StateAndEffect) {
    return new StateAndEffect(state.state, ...effects);
  }
  return new StateAndEffect(state, ...effects);
}
