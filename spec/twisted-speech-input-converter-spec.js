import TwistedSpeechInputConverter from '../js/twisted-speech-input-converter.js';

let twistedSpeechInputConverter = new TwistedSpeechInputConverter();


describe('twistedSpeechInputConverter', () => {
	
	let input = '320 1';
		
	it(input, () => {
		expect(twistedSpeechInputConverter.convertTwistedSpeechInput(input))
		.toEqual(321);
	});	
});

describe('twistedSpeechInputConverter', () => {
	
	let input = '1000 1';
		
	it(input, () => {
		expect(twistedSpeechInputConverter.convertTwistedSpeechInput(input))
		.toEqual(1001);
	});	
});

describe('twistedSpeechInputConverter', () => {

	it('converts spoken zehneins words with whitespace', () => {
		let speechRecognitionEvent = {
			results: [
				[
					{
						transcript: 'zwanzig eins'
					}
				]
			]
		};

		expect(twistedSpeechInputConverter.convertTwistedSpeechRecognition(2, speechRecognitionEvent))
		.toEqual(21);
	});

	it('converts spoken zehneins words without whitespace', () => {
		let speechRecognitionEvent = {
			results: [
				[
					{
						transcript: 'zwanzigeins'
					}
				]
			]
		};

		expect(twistedSpeechInputConverter.convertTwistedSpeechRecognition(2, speechRecognitionEvent))
		.toEqual(21);
	});
});
