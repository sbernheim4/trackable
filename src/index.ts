export type AnalyticsEvent = {
	caller?: string;
	input?: unknown;
	currentValue?: unknown,
	[key: string]: unknown,
};

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }


type TrackingFunction<AnalyticsEvent> = (event: AnalyticsEvent[]) => void;
type TrackingFunctionAsync<AnalyticsEvent> = (event: AnalyticsEvent[]) => Promise<void>;

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
		analyticsEvents: WithRequired<AnalyticsEvent, 'currentValue'> | Array<WithRequired<AnalyticsEvent, 'currentValue'>>
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
	map<A>(transformationFunction: (val: Value) => A): Trackable<A> {

		const newUnderlyingValue = transformationFunction(this.getValue());

		const mergedAnalyticsEvents = [
			...this.getAnalyticsEvents(),
			{
				caller: transformationFunction.name || 'anonymous',
				input: this.getValue(),
				currentValue: newUnderlyingValue,
			},
		];

		const newTrackable = Trackable.privateOf(
			newUnderlyingValue,
			// @ts-ignore
			mergedAnalyticsEvents
		);

		// @ts-ignore
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

		const newTrackableInstance = transformationFunction(this.getValue());

		const newUnderlyingValue = newTrackableInstance.getValue();

		const mergedAnalyticsEvents = [
			...this.getAnalyticsEvents(),
			{
				...newTrackableInstance.getAnalyticsEvents()[0],
				caller: transformationFunction.name || 'anonymous',
				input: this.getValue(),
				currentValue: newUnderlyingValue,
			},
		];

		const newTrackable = Trackable.privateOf(
			newUnderlyingValue,
			// @ts-ignore
			mergedAnalyticsEvents
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

	private static privateOf<Value>(
		value: Value,
		analyticsEvents: Array<WithRequired<AnalyticsEvent, 'currentValue'>>
	) {

		const providedInfo = {
			currentValue: value,
		} satisfies WithRequired<AnalyticsEvent, 'currentValue'>;

		const analyticsEventsToPass = [
			...analyticsEvents,
			providedInfo
		].slice(0, -1);

		const trackableInstance = new Trackable(value, analyticsEventsToPass);

		return trackableInstance;

	}

	/**
	 * Construct and return a Trackable instance.
	 *
	 * Prefer over using the new keyword.
	 */
	static of<Value>(
		value: Value,
		analyticsEvents: AnalyticsEvent,
	) {

		const providedInfo = {
			currentValue: value,
		};

		const analyticsEventsToPass = {
			...analyticsEvents,
			...providedInfo,
		} satisfies WithRequired<AnalyticsEvent, 'currentValue'>;

		const trackableInstance = new Trackable(value, analyticsEventsToPass);

		return trackableInstance;

	}

}
