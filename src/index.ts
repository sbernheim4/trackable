export type ProvidedAnalyticsInfo<T> = {
	caller?: string;
	arguments: Array<unknown>;
	value: T,
};

type TrackingFunction<AnalyticsEvent> = (event: AnalyticsEvent[]) => void;
type TrackingFunctionAsync<AnalyticsEvent> = (event: AnalyticsEvent[]) => Promise<void>;

/**
 * A Trackable class. Useful for functions whose invocation should be known by
 * an external source or entity. Those functions should return an instance of
 * this class that can be passed around to other functions.
 */
export class Trackable<Value, AnalyticsEvent>{

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

		const data = Array.isArray(analyticsEvents) ?
			analyticsEvents :
			[analyticsEvents]

		this.analyticsEvents = data;
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
		return this.toString();
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
	map<A>(transformationFunction: (val: Value) => A): Trackable<A, AnalyticsEvent> {

		const transformedValue = transformationFunction(this.getValue());

		const existingAnalyticsEvents = this.getAnalyticsEvents();

		const newAnalyticsEvent: AnalyticsEvent = {
			caller: transformationFunction.name ?? 'anonymous',
			arguments: [this.getValue()],
			value: transformedValue,
		};

		const analyticsEvents: AnalyticsEvent[] = [
			...existingAnalyticsEvents,
			newAnalyticsEvent,
		];

		const newTrackable = Trackable.of(
			transformedValue,
			analyticsEvents
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
	flatMap<A>(transformationFunction: (val: Value) => Trackable<A, AnalyticsEvent>): Trackable<A, AnalyticsEvent> {

		const newTrackableInstance = transformationFunction(this.getValue());

		const newUnderlyingValue = newTrackableInstance.getValue();

		const mergedTrackingData = [
			...this.getAnalyticsEvents(),
			{
				...newTrackableInstance.getAnalyticsEvents()[0],
				caller: transformationFunction.name,
				arguments: [this.getValue()],
				value: newUnderlyingValue,
			},
		];

		const newTrackable = Trackable.of(
			newUnderlyingValue,
			mergedTrackingData
		);

		// @ts-ignore
		return newTrackable;

	}

	/**
	 * Fire off analytics events via the given function for all stored track
	 * events.
	 */
	run(
		trackingFunction: TrackingFunction<AnalyticsEvent>
	) {
		const events = this.getAnalyticsEvents();

		trackingFunction(events);

		return this.getValue();

	}

	async runAsync(trackingFunction: TrackingFunctionAsync<AnalyticsEvent>) {
		const events = this.getAnalyticsEvents();

		await trackingFunction(events);

		return this.getValue();

	}

	/**
	 * Construct and return a Trackable instance.
	 *
	 * Prefer over using the new keyword.
	 */
	static of<Value, AnalyticsEvent>(
		value: Value,
		analyticsEvents?: AnalyticsEvent | Array<AnalyticsEvent>
	) {

		const trackableInstance = new Trackable(value, analyticsEvents ?? []);

		return trackableInstance;

	}

}
