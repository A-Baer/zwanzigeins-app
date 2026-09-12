import Utils from '../js/utils.js';
import { exampleGameScores } from '../marketing/statistics-example-data.js';

describe('Marketing statistics example', () => {
	it('shows a clear improvement without an implausibly perfect curve', () => {
		const first = exampleGameScores[0];
		const last = exampleGameScores.at(-1);
		const sessionTimes = exampleGameScores.map(score => Utils.parseTimeToSeconds(score.elapsedTime));
		const timeChanges = sessionTimes.slice(1).map((seconds, index) => seconds - sessionTimes[index]);
		const setbackAmounts = timeChanges.filter(change => change > 0);
		const plateauSessions = timeChanges.filter(change => Math.abs(change) <= 2).length;
		const opposingChanges = exampleGameScores.slice(1).filter((score, index) => {
			const timeChange = sessionTimes[index + 1] - sessionTimes[index];
			const errorChange = score.numErrors - exampleGameScores[index].numErrors;

			return timeChange * errorChange < 0;
		}).length;

		expect(exampleGameScores.length).toBe(30);
		expect(Utils.parseTimeToSeconds(last.elapsedTime)).toBeLessThan(
			Utils.parseTimeToSeconds(first.elapsedTime) / 2
		);
		expect(last.numErrors).toBe(0);
		expect(first.numErrors).toBeGreaterThan(last.numErrors);
		expect(Math.max(...setbackAmounts)).toBeGreaterThanOrEqual(10);
		expect(new Set(setbackAmounts).size).toBeGreaterThanOrEqual(5);
		expect(plateauSessions).toBeGreaterThanOrEqual(8);
		expect(opposingChanges).toBeGreaterThanOrEqual(5);
	});
});
