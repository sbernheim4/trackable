import { describe, expect, it, vi } from 'vitest';
import { Trackable } from './../src';
import { AnalyticsEvent } from './Trackable';

describe("Trackable", () => {

	describe('track random numbers that are generated in application code function bodies', () => {

		// A function that returns a trackable instance where the random number
		// is stored in the analytics event payload.
		const addThreeAndRandom = (val: number) => {
			const random = Math.random();

			const newValue = val + 3 + random;

			return Trackable.of(
				newValue,
				// The analytics event for this function call
				{ randomNumber: random, }
			);
		};

		// Another function that returns a trackable instance where the random
		// number is stored in the analytics event payload.
		const multiplyBy5AndRandom = (val: number) => {
			const random = Math.random();

			const newValue = val * (5 + random);

			return Trackable.of(
				newValue,
				// The analytics event for this function call
				{ randomNumber: random, }
			);
		};

		// A function without anything specific to be tracked.
		const addTwo = (x: number) => x + 2;

		it("there are 3 events when there are 3 functions invoked for a trackable", () => {

			const trackingFunction = vi.fn();

			// Now we can easily interact with our Trackable instance.
			const res = addThreeAndRandom(5)
				// flatmapping when the function provided returns a Trackable
				// instance itself
				.flatMap(multiplyBy5AndRandom)
				// And regular mapping when the function provided does not
				// return a trackable instance itself;
				.map(addTwo)
				.run(trackingFunction);

			expect(res).toBeGreaterThan(40);
			expect(res).toBeLessThan(59);

			expect(trackingFunction).toHaveBeenCalledTimes(1);

			const events = trackingFunction.mock.calls[0][0] as AnalyticsEvent[]

			const metadata = events.map(x => x.metadata);
			const randomNumbersUsed = events.map(x => x['randomNumber'] ?? false).filter(Boolean);

			const eventValues = metadata.map(entry => entry?.currentValue ?? false).filter(Boolean);
			const callers = metadata.map(entry => entry?.caller ?? false).filter(Boolean);
			const inputs = metadata.map(entry => entry?.input ?? false).filter(Boolean);

			expect(events.length).toBe(3);
			expect(callers).toStrictEqual([
				"multiplyBy5AndRandom",
				"addTwo",
			]);
			expect(randomNumbersUsed.length).toBe(2);
			expect(eventValues.length).toBe(3);
			expect(inputs.length).toBe(2);

		});

	});

	describe('trackables work with non primitives', () => {

		it('methods work with objects', () => {

			type Person = { name: string, age: number };

			const createPersonWithEvent = (name: string, age: number) => {
				return Trackable.of<Person>(
					{ name, age },
					{ 'event': 'creating person', }
				);
			};

			const sam = createPersonWithEvent('sam', 27);

			const changeName = (person: Person) => {
				person.name = 'some other name';
			};

			const celebrateBDay = (x: Person) => {
				// Perform whatever mutations we want to the underlying object
				x.age++;

				// Return an instance with a custom event
				return Trackable.of(
					x,
					{ event: 'celebrate bday', ageIncrement: 1 }
				);
			};

			const trackingFunction = vi.fn();

			const agedSam = sam
				.flatMap(celebrateBDay)
				.map(changeName)
				.flatMap(celebrateBDay)
				.run(trackingFunction);

			expect(agedSam.age).toBe(29);
			expect(agedSam.name).toBe('some other name');
			expect(trackingFunction).toHaveBeenCalledWith([
				{
					"event": "creating person",
					"metadata": {
						"currentValue": {
							"age": 27,
							"name": "sam",
						},
					},
				},
				{
					"ageIncrement": 1,
					"event": "celebrate bday",
					"metadata": {
						"caller": "celebrateBDay",
						"currentValue": {
							"age": 28,
							"name": "sam",
						},
						"input": {
							"age": 27,
							"name": "sam",
						},
					},
				},
				{
					"metadata": {
						"caller": "changeName",
						"currentValue": {
							"age": 28,
							"name": "some other name",
						},
						"input": {
							"age": 28,
							"name": "sam",
						},
					},
				},
				{
					"ageIncrement": 1,
					"event": "celebrate bday",
					"metadata": {
						"caller": "celebrateBDay",
						"currentValue": {
							"age": 29,
							"name": "some other name",
						},
						"input": {
							"age": 28,
							"name": "some other name",
						},
					},
				},
			],

			);

		});

	});

});
