type AnalyticsEvents = {
	functionName: string;
	arguments: Array<unknown>
	info: any
};

/**
 * A trackable class. Useful for functions whose invocation should be known by
 * an external source or entity.
 */
class Trackable<Value>{

	private value: Value;
	private analyticsEvents: Array<AnalyticsEvents>

	/**
	 * Construct an instance of a trackable
	 *
	 * Prefer using the static `of` method. This constructor is private
	 */
	private constructor(
		value: Value,
		analyticsEvents: AnalyticsEvents | Array<AnalyticsEvents>
	) {
		this.value = value;

		const data = Array.isArray(analyticsEvents) ?
			analyticsEvents :
			[analyticsEvents]

		this.analyticsEvents = data;
	}

	/**
	 * Retrieve the underlying value of the Trackable instance
	 */
	getValue() {
		return this.value;
	}

	/**
	 * Retrieve the analytics events that have been built up
	 */
	getAnalyticsEvents() {
		return this.analyticsEvents;
	}

	/**
	 * Determine if the underlying instance contains a value
	 */
	private containsValue() {
		return !!this.getValue();
	}

	/**
	 * Return a stringified version of the Trackble instance suitable for
	 * logging
	 */
	toString() {
		return `
value: ${this.getValue()}
analyticsEvents: ${this.getAnalyticsEvents()}
`;
	}

	/**
	 * Return a stringified version of the Trackble instance suitable for
	 * logging.
	 *
	 * An alias for toString
	 */
	toStr() {
		return this.toString();
	}

	/**
	 * Log a stringified version of the instance
	 */
	log() {
		console.log(this.toStr());
	}

	/**
	 * Log a stringified version of the instance returning the instance for
	 * continued method calls
	 */
	logAndContinue() {
		console.log(this.toStr());

		return this;
	}

	// Monadic Methods

	/**
	 * The monadic map method.
	 *
	 * Continue to transform the underlying value while preserving any built up
	 * trackable events.
	 *
	 * Use when the function passed to this method returns a non Trackable value
	 */
	map<A>(transformationFunction: (val: Value) => A): Trackable<Value | A> {

		if (this.containsValue()) {

			const transformedValue = transformationFunction(this.getValue());

			const newTrackable = Trackable.of(
				transformedValue,
				this.getAnalyticsEvents()
			);

			return newTrackable;

		} else {

			return this;

		}
	}

	/**
	 * The monadic flatmap method. Also known as chain or bind.
	 *
	 * Continue to transform the underlying value while preserving any built up
	 * track events.
	 *
	 * Use when the function passed to this method returns a Trackable instance
	 */
	flatMap<A>(fn: (val: Value) => Trackable<A>): Trackable<Value | A> {

		if (this.containsValue()) {

			const newTrackableInstance = fn(this.getValue());

			const newUnderlyingValue = newTrackableInstance.getValue();

			const mergedTrackingData = [
				...this.getAnalyticsEvents(),
				...newTrackableInstance.getAnalyticsEvents()
			];

			const newTrackable = Trackable.of(
				newUnderlyingValue,
				mergedTrackingData
			);

			return newTrackable;

		} else {

			return this;

		}

	}

	/**
	 * Fire off analytics events via the given function for all stored track
	 * events.
	 */
	async run(trackingFunction: (event: AnalyticsEvents) => Promise<void>) {
		const events = this.getAnalyticsEvents();

		const promises = events.map(trackingFunction);

		await Promise.all(promises);

		return this.getValue();
	}

	/**
	 * Construct and return a Trackable instance.
	 *
	 * Prefer over using the new keyword
	 */
	static of<Value>(value: Value, analyticsEvents: Array<AnalyticsEvents>) {

		const trackableInstance = new Trackable(value, analyticsEvents);

		return trackableInstance;

	}

}
