export type AnalyticsEvent = {
	metadata: {
		caller?: string;
		input?: unknown;
		currentValue: unknown,

	};
	[key: string]: unknown,
};

/**
 * A Trackable class. Useful for functions whose invocation should be known by
 * an external source or entity. Those functions should return an instance of
 * this class that can be passed around to other functions.
 */
export class Trackable<Value>{

	private value: Value;
	private analyticsEvents: Array<AnalyticsEvent>

	/**
	 * Construct an instance of a trackable.
	 *
	 * Prefer using the static `of` method. This constructor
	 * is private.
	 */
	private constructor(
		value: Value,
		analyticsEvents: AnalyticsEvent | Array<AnalyticsEvent>
	) {
		this.value = value;

		if (Array.isArray(analyticsEvents)) {
			this.analyticsEvents = analyticsEvents;
		} else {
			this.analyticsEvents = [analyticsEvents];
		}

	}

	/**
	 * Retrieve the underlying value of the Trackable
	 * instance.
	 */
	getValue() {
		return this.value;
	}

	/**
	 * Retrieve the analytics events that have been built
	 * up.
	 */
	getAnalyticsEvents() {
		return this.analyticsEvents;
	}

	/**
	 * Determine if the underlying instance contains a
	 * value.
	 */
	// @ts-ignore
	private containsValue() {
		return !!this.getValue();
	}

	/**
	 * Return a stringified version of the Trackble instance suitable for
	 * logging.
	 */
	toString() {
		return `value: ${this.getValue()}\nanalyticsEvents: ${this.getAnalyticsEvents()}`;
	}

	/**
	 * Return a stringified version of the Trackble instance suitable for
	 * logging.
	 *
	 * An alias for toString.
	 */
	toStr() {
		return this;
	}

	/**
	 * Log a stringified version of the instance.
	 */
	log() {
		console.log(this.toStr());
	}

	/**
	 * Log a stringified version of the instance returning the instance for
	 * continued method calls.
	 */
	logAndContinue() {
		console.log(this.toStr());

		return this;
	}

	/**
	 * The monadic map method.
	 *
	 * Continue to transform the underlying value while preserving any built up
	 * trackable events.
	 *
	 * Use when the function passed to this method returns a non Trackable
	 * value.
	 */
	map<A>(transformationFunction: (val: Value) => A): Trackable<Value> {

		// Need to set the 'input' before the transformation function is
		// invoked. Otherwise any updating that the transformationFunction does
		// to the underlying value will be carried into the metadata. The caller
		// is defined purely for conveneince and not out of any need.
		let metadata = {
			caller: transformationFunction.name || 'anonymous',
			input: structuredClone(this.getValue())
		};

		const originalUnderlyingValue = this.getValue();

		const resultOfTransformation = transformationFunction(this.getValue())

		const newValueToFormTrackableWith = typeof originalUnderlyingValue === 'object' || typeof originalUnderlyingValue === 'function' || typeof originalUnderlyingValue === 'symbol'
			? this.getValue()
			: resultOfTransformation as unknown as Value;

		const mergedAnalyticsEvents = [
			...this.getAnalyticsEvents(),
			{
				metadata: {
					...metadata,
					currentValue: structuredClone(this.getValue()),
				},
			}
		];

		const newTrackable = new Trackable(
			newValueToFormTrackableWith,
			mergedAnalyticsEvents
		);

		return newTrackable;

	}

	/**
	 * The monadic flatmap method. Also known as chain or bind.
	 *
	 * Continue to transform the underlying value while preserving any built up
	 * track events.
	 *
	 * Use when the function passed to this method returns a Trackable instance.
	 */
	flatMap<A>(transformationFunction: (val: Value) => Trackable<A>): Trackable<A> {

		// Need to set the 'input' before the transformation function is
		// invoked. Otherwise any updating that the transformationFunction does
		// to the underlying value will be carried into the metadata. The caller
		// is defined purely for conveneince and not out of any need.
		//
		// structuredClone is used to ensure that a new reference is created as
		// using the same reference will show the updated value across all
		// copies of the metadata. This makes instances of a Trackable somewhat
		// heavy especially for complex objects.
		let metadata = {
			caller: transformationFunction.name || 'anonymous',
			input: structuredClone(this.getValue())
		};

		const newTrackableInstance = transformationFunction(this.getValue());

		const newUnderlyingValue = newTrackableInstance.getValue();

		const mergedAnalyticsEvents = [
			...this.getAnalyticsEvents(),
			{
				...newTrackableInstance.getAnalyticsEvents()[0],
				metadata: {
					...metadata,
					currentValue: structuredClone(newUnderlyingValue),
				}
			},
		];

		const newTrackable = new Trackable(
			newUnderlyingValue,
			mergedAnalyticsEvents
		);

		return newTrackable;

	}

	/**
	 * Fire off analytics events via the given function for all stored track
	 * events and returns the underlying value.
	 */
	run(
		trackingFunction: (events: AnalyticsEvent[]) => void
	) {
		const events = this.getAnalyticsEvents();

		trackingFunction(events);

		return this.getValue();

	}

	/**
	 * Fire off analytics events via the given function for all stored track
	 * events and returns the underlying value.
	 */
	async runAsync(trackingFunctionAsync: (events: AnalyticsEvent[]) => Promise<void>) {
		const events = this.getAnalyticsEvents();

		await trackingFunctionAsync(events);

		return this.getValue();

	}

	/**
	 * Construct and return a Trackable instance.
	 *
	 * Prefer over using the new keyword.
	 */
	static of<Value>(
		value: Value,
		analyticsEvents?: Record<string, any>,
	) {

		const metadata = {
			currentValue: structuredClone(value),
		};

		const analyticsEventsToPass = {
			...analyticsEvents,
			metadata,
		};

		const trackableInstance = new Trackable(value, analyticsEventsToPass);

		return trackableInstance;

	}

}
