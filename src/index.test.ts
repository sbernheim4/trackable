import { describe, it, expect, vi } from 'vitest';
import util from 'util';
import { Trackable } from './../src';

describe("Trackable", () => {

	describe('an example with functions that use random numbers', () => {

		const addThreeAndRandom = (val: number) => {
			const random = Math.random();

			const newValue = val + 3 + random;

			return Trackable.of(
				newValue,
				// The analytics event for this function call
				{ randomNumber: random }
			);
		};

		const multiplyBy5AndRandom = (val: number) => {
			const random = Math.random();

			const newValue = val * (5 + random);

			return Trackable.of(
				newValue,
				// The analytics event for this function call
				{ randomNumber: random, }
			);
		};

		const addTwo = (x: number) => x + 2;

		it("should support map, flatMap, and carry events to the tracking function", () => {

			const trackingFunction = vi.fn();

			const res = addThreeAndRandom(5)
				.flatMap(multiplyBy5AndRandom)
				.map(addTwo)
				.run(trackingFunction);

			expect(res).toBeGreaterThan(40);
			expect(res).toBeLessThan(59);

			expect(trackingFunction).toHaveBeenCalledTimes(1);

			const events = trackingFunction.mock.calls[0][0];

			const callers = events.map(x => x.caller ?? false).filter(Boolean);
			const randomNumbersUsed = events.map(x => x.randomNumber ?? false).filter(Boolean);
			const eventValues = events.map(x => x.currentValue ?? false).filter(Boolean);

			expect(events.length).toBe(3);
			expect(callers).toStrictEqual([
				"multiplyBy5AndRandom",
				"addTwo",
			]);
			expect(randomNumbersUsed.length).toBe(2);
			expect(eventValues.length).toBe(3);

		});

	});

});
