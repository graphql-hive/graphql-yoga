import { chain, GenericInstrumentation } from '../src';

describe('instrumentation', () => {
  describe('chain', () => {
    it('should execute instrument in the same order than the array', () => {
      const result: number[] = [];
      const createInstrument = (name: number): GenericInstrumentation => ({
        execute: (_, wrapped) => {
          result.push(name);
          wrapped();
          result.push(name);
        },
      });

      let [instrument, ...instrumentation] = [
        createInstrument(1),
        createInstrument(2),
        createInstrument(3),
        createInstrument(4),
      ];

      for (const other of instrumentation) {
        instrument = chain(instrument, other);
      }

      instrument['execute']!({}, () => {});
      expect(result).toEqual([1, 2, 3, 4, 4, 3, 2, 1]);
    });

    it('should execute instrument in the same order when async', async () => {
      const result: number[] = [];
      const createInstrument = (name: number): GenericInstrumentation => ({
        execute: async (_, wrapped) => {
          result.push(name);
          await wrapped();
          result.push(name);
        },
      });

      let [instrument, ...instrumentation] = [
        createInstrument(1),
        createInstrument(2),
        createInstrument(3),
        createInstrument(4),
      ];

      for (const other of instrumentation) {
        instrument = chain(instrument, other);
      }

      await instrument['execute']!({}, () => new Promise(r => setTimeout(r, 10)));
      expect(result).toEqual([1, 2, 3, 4, 4, 3, 2, 1]);
    });

    it('should merge all instrument methods', () => {
      const instrument1 = {
        execute: jest.fn().mockImplementation(dumbInstrument),
        operation: jest.fn().mockImplementation(dumbInstrument),
      };

      const instrument2 = {
        execute: jest.fn().mockImplementation(dumbInstrument),
        request: jest.fn().mockImplementation(dumbInstrument),
      };

      const instrument = chain(instrument1, instrument2);

      const executeSpy = jest.fn();
      instrument.execute({}, executeSpy);
      expect(executeSpy).toHaveBeenCalled();
      expect(instrument1.execute).toHaveBeenCalled();
      expect(instrument2.execute).toHaveBeenCalled();

      const operationSpy = jest.fn();
      instrument.operation({}, operationSpy);
      expect(operationSpy).toHaveBeenCalled();
      expect(instrument1.operation).toHaveBeenCalled();

      const requestSpy = jest.fn();
      instrument.request({}, requestSpy);
      expect(instrument2.request).toHaveBeenCalled();
    });

    it('should pass the payload all the way down the instrument chain', () => {
      const make = () => ({
        execute: jest.fn().mockImplementation(dumbInstrument),
      });

      const instrumentation = [make(), make(), make(), make()];

      const payload = { test: 'foo' };

      instrumentation.reduce(chain).execute(payload, () => {});
      for (const instrument of instrumentation) {
        expect(instrument.execute).toHaveBeenCalledWith(payload, expect.anything());
      }
    });
  });
});

const dumbInstrument = (_: unknown, w: () => void) => w();
