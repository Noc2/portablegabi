/* eslint-disable @typescript-eslint/no-explicit-any */
import WasmHooks from '../wasm/WasmHooks'

export default interface IGoWasm {
  execWasmFn: (
    fn: WasmHooks,
    fnArgs?: Array<string | number | boolean>
  ) => Promise<any>
  close: () => void
  // from wasm_exec.js
  env: Record<string, any>
  argv: ['js']
  exit: (code: number) => void
  _exitPromise: (resolve: any) => void
  _pendingEvent: null | number
  _scheduledTimeouts: Map<any, any>
  _nextCallbackTimeoutID: number
  importObject: {
    go: {
      'runtime.wasmExit': Function
      'runtime.wasmWrite': Function
      'runtime.walltime': Function
      'runtime.scheduleTimeoutEvent': Function
      'runtime.clearTimeoutEvent': Function
      'runtime.getRandomData': Function
      'syscall/js.stringVal': Function
      'syscall/js.valueGet': Function
      'syscall/js.valueSet': Function
      'syscall/js.valueIndex': Function
      'syscall/js.valueSetIndex': Function
      'syscall/js.valueCall': Function
      'syscall/js.valueInvoke': Function
      'syscall/js.valueNew': Function
      'syscall/js.valueLength': Function
      'syscall/js.valuePrepareString': Function
      'syscall/js.valueLoadString': Function
      'syscall/js.valueInstanceOf': Function
      'syscall/js.copyBytesToGo': Function
      'syscall/js.copyBytesToJS': Function
      debug: (value: any) => void
    }
  }
  run: Function
  _resume: Function
  _makeFuncWrapper: Function
}
