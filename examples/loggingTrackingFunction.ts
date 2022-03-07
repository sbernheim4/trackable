import { AnalyticsEvents, Trackable } from './../src';

const trackingFunction = (event: AnalyticsEvents) => {
	console.log({ ...event });
};

const addThreeAndRandom = (val: number) => {
	const random = Math.random();

	const newValue = val + 3 + random;

	return Trackable.of(
		newValue,
		// The analytics event for this function call
		{
			functionName: 'addThreeAndRandom',
			arguments: [val],
			value: newValue,
			info: { random }
		}
	);
};

const multiplyBy5AndRandom = (val: number) => {
	const random = Math.random();

	const newValue = val * 5 * random;

	return Trackable.of(
		newValue,
		// The analytics event for this function call
		{
			functionName: 'multiplyBy5AndRandom',
			arguments: [val],
			value: newValue,
			info: { random }
		}
	);
}

const res = addThreeAndRandom(5)
	.flatMap(multiplyBy5AndRandom)
	.map(x => x + 2)
	.flatMap(addThreeAndRandom)
	.run(trackingFunction);

console.log(typeof res);
