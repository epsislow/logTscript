var ComponentRegistry = (typeof require !== 'undefined') ? require('./component-registry') : ComponentRegistry;
var LedComponent = (typeof require !== 'undefined') ? require('./led') : LedComponent;
var LedBarComponent = (typeof require !== 'undefined') ? require('./ledBar') : LedBarComponent;
var SwitchComponent = (typeof require !== 'undefined') ? require('./switch') : SwitchComponent;
var KeyComponent = (typeof require !== 'undefined') ? require('./key') : KeyComponent;
var KeyboardComponent = (typeof require !== 'undefined') ? require('./keyboard') : KeyboardComponent;
var DipComponent = (typeof require !== 'undefined') ? require('./dip') : DipComponent;
var IoportComponent = (typeof require !== 'undefined') ? require('./ioport') : IoportComponent;
var SevenSegComponent = (typeof require !== 'undefined') ? require('./seven-seg') : SevenSegComponent;
var ClockDotsComponent = (typeof require !== 'undefined') ? require('./dots') : ClockDotsComponent;
var FourteenSegComponent = (typeof require !== 'undefined') ? require('./14seg') : FourteenSegComponent;
var LcdComponent = (typeof require !== 'undefined') ? require('./lcd') : LcdComponent;
var TerminalComponent = (typeof require !== 'undefined') ? require('./terminal') : TerminalComponent;
var AdderComponent = (typeof require !== 'undefined') ? require('./adder') : AdderComponent;
var SubtractComponent = (typeof require !== 'undefined') ? require('./subtract') : SubtractComponent;
var MultiplierComponent = (typeof require !== 'undefined') ? require('./multiplier') : MultiplierComponent;
var DividerComponent = (typeof require !== 'undefined') ? require('./divider') : DividerComponent;
var LutComponent = (typeof require !== 'undefined') ? require('./lut') : LutComponent;
var ShifterComponent = (typeof require !== 'undefined') ? require('./shifter') : ShifterComponent;
var MemComponent = (typeof require !== 'undefined') ? require('./mem') : MemComponent;
var RegComponent = (typeof require !== 'undefined') ? require('./reg') : RegComponent;
var CounterComponent = (typeof require !== 'undefined') ? require('./counter') : CounterComponent;
var QueueComponent = (typeof require !== 'undefined') ? require('./queue') : QueueComponent;
var StackComponent = (typeof require !== 'undefined') ? require('./stack') : StackComponent;
var NetworkComponent = (typeof require !== 'undefined') ? require('./network') : NetworkComponent;
var OscComponent = (typeof require !== 'undefined') ? require('./osc') : OscComponent;
var RotaryComponent = (typeof require !== 'undefined') ? require('./rotary') : RotaryComponent;
var SliderComponent = (typeof require !== 'undefined') ? require('./slider') : SliderComponent;
var ClcdComponent = (typeof require !== 'undefined') ? require('./clcd') : ClcdComponent;
var AluComponent = (typeof require !== 'undefined') ? require('./alu') : AluComponent;
var CpuComponent = (typeof require !== 'undefined') ? require('./cpu') : CpuComponent;
var PcbComponent = (typeof require !== 'undefined') ? require('./pcb-component') : PcbComponent;

function createComponentRegistry() {
  const registry = new ComponentRegistry();
  registry.register(LedComponent);
  registry.register(LedBarComponent);
  registry.register(SwitchComponent);
  registry.register(KeyComponent);
  registry.register(KeyboardComponent);
  registry.register(DipComponent);
  registry.register(IoportComponent);
  registry.register(SevenSegComponent);
  registry.register(FourteenSegComponent);
  registry.register(LcdComponent);
  registry.register(TerminalComponent);
  registry.register(AdderComponent);
  registry.register(SubtractComponent);
  registry.register(MultiplierComponent);
  registry.register(DividerComponent);
  registry.register(LutComponent);
  registry.register(ShifterComponent);
  registry.register(MemComponent);
  registry.register(RegComponent);
  registry.register(CounterComponent);
  registry.register(QueueComponent);
  registry.register(StackComponent);
  registry.register(NetworkComponent);
  registry.register(OscComponent);
  registry.register(RotaryComponent);
  registry.register(SliderComponent);
  registry.register(ClcdComponent);
  registry.register(AluComponent);
  registry.register(CpuComponent);
  registry.register(ClockDotsComponent);
  return registry;
}

function createSignalPropagationStrategy(kind = 'wave') {
  if (typeof WavePropagationStrategy === 'undefined') {
    return null;
  }
  const strategy = kind === 'legacy'
    ? new LegacyCascadePropagationStrategy()
    : new WavePropagationStrategy();
  strategy.setDebugLevel(0);
  return strategy;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createComponentRegistry, ComponentRegistry, PcbComponent, createSignalPropagationStrategy };
}
