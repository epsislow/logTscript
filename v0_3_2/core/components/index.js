var ComponentRegistry = (typeof require !== 'undefined') ? require('./component-registry') : ComponentRegistry;
var LedComponent = (typeof require !== 'undefined') ? require('./led') : LedComponent;
var SwitchComponent = (typeof require !== 'undefined') ? require('./switch') : SwitchComponent;
var KeyComponent = (typeof require !== 'undefined') ? require('./key') : KeyComponent;
var DipComponent = (typeof require !== 'undefined') ? require('./dip') : DipComponent;
var SevenSegComponent = (typeof require !== 'undefined') ? require('./seven-seg') : SevenSegComponent;
var Seg14Component = (typeof require !== 'undefined') ? requre('./14seg') : Seg14Component;
var LcdComponent = (typeof require !== 'undefined') ? require('./lcd') : LcdComponent;
var AdderComponent = (typeof require !== 'undefined') ? require('./adder') : AdderComponent;
var SubtractComponent = (typeof require !== 'undefined') ? require('./subtract') : SubtractComponent;
var MultiplierComponent = (typeof require !== 'undefined') ? require('./multiplier') : MultiplierComponent;
var DividerComponent = (typeof require !== 'undefined') ? require('./divider') : DividerComponent;
var ShifterComponent = (typeof require !== 'undefined') ? require('./shifter') : ShifterComponent;
var MemComponent = (typeof require !== 'undefined') ? require('./mem') : MemComponent;
var RegComponent = (typeof require !== 'undefined') ? require('./reg') : RegComponent;
var CounterComponent = (typeof require !== 'undefined') ? require('./counter') : CounterComponent;
var OscComponent = (typeof require !== 'undefined') ? require('./osc') : OscComponent;
var RotaryComponent = (typeof require !== 'undefined') ? require('./rotary') : RotaryComponent;
var PcbComponent = (typeof require !== 'undefined') ? require('./pcb-component') : PcbComponent;

function createComponentRegistry() {
  const registry = new ComponentRegistry();
  registry.register(LedComponent);
  registry.register(SwitchComponent);
  registry.register(KeyComponent);
  registry.register(DipComponent);
  registry.register(SevenSegComponent);
  registry.register(Seg14Component);
  registry.register(LcdComponent);
  registry.register(AdderComponent);
  registry.register(SubtractComponent);
  registry.register(MultiplierComponent);
  registry.register(DividerComponent);
  registry.register(ShifterComponent);
  registry.register(MemComponent);
  registry.register(RegComponent);
  registry.register(CounterComponent);
  registry.register(OscComponent);
  registry.register(RotaryComponent);
  return registry;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createComponentRegistry, ComponentRegistry, PcbComponent };
}
