import { describe, expect, it, vi } from 'vitest';
import { Trackable } from './../src';
import { AnalyticsEvent } from './Trackable';

describe("Trackable", () => {

	describe('track random numbers that are generated in application code function bodies', () => {

		// First we write some functinos that mimic application code where there
		// is some business logic and invocations to other functions to get
		// data.
		//
		// Here's the 1st
		const addThreeAndRandom = (val: number) => {
			const random = Math.random();

			const newValue = val + 3 + random;

			return Trackable.of(
				newValue,
				// The analytics event for this function call
				{ randomNumber: random, }
			);
		};

		// Here's the 2nd
		const multiplyBy5AndRandom = (val: number) => {
			const random = Math.random();

			const newValue = val * (5 + random);

			return Trackable.of(
				newValue,
				// The analytics event for this function call
				{ randomNumber: random, }
			);
		};

		// And here's the 3rd - this one doesn't have any specific data that we
		// want to track - its pure business logic.
		const addTwo = (x: number) => x + 2;

		it("there are 3 events when there are 3 functions invoked for a trackable", () => {

			const trackingFunction = vi.fn();

			// We construct our initial instance which is a value whose function
			// calls we want to fire analytics events for.
			const valueToTrack = Trackable.of(5);

			// Here we being using those instance methods just like we would for
			// an Array:
			const res = valueToTrack
				.flatMap(addThreeAndRandom)
				.map(addTwo)
				.flatMap(multiplyBy5AndRandom)
				.run(trackingFunction);

			// Invoking `run` returns to us the underlying value (a number) and
			// fires off all the analytics events so we expect our result to be
			// in the following range given the math we've done:
			expect(res).toBeGreaterThan(40);
			expect(res).toBeLessThan(64);

			// The trackingFunction should have been invoked once and given all
			// the analytics events which includes the random numbers used at
			// each function call.
			expect(trackingFunction).toHaveBeenCalledTimes(1);

			const events = trackingFunction.mock.calls[0][0] as AnalyticsEvent[]
			const metadata = events.map(x => x.metadata);
			const randomNumbersUsed = events.map(x => x['randomNumber'] ?? false).filter(Boolean);
			const eventValues = metadata.map(entry => entry?.currentValue ?? false).filter(Boolean);
			const callers = metadata.map(entry => entry?.caller ?? false).filter(Boolean);
			const inputs = metadata.map(entry => entry?.input ?? false).filter(Boolean);

			// And we expect 4 events (1 for the inital construction of the
			// trackable and 3 from the calling functions).
			expect(events.length).toBe(4);

			expect(callers).toStrictEqual([
				'addThreeAndRandom',
				"addTwo",
				"multiplyBy5AndRandom",
			]);

			// There should be 2 randomNumbers in the analytics events from
			// invoking `addThreeAndRandom` and `multiplyBy5AndRandom`.
			expect(randomNumbersUsed.length).toBe(2);

			// We also track all the values at each map/flatmap invokation so we
			// expect 4 of them.
			expect(eventValues.length).toBe(4);

			// And we expect there to be three `input` key/value pairs (one for
			// each map/flatMap call).
			expect(inputs.length).toBe(3);

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
