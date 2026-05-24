import Utils from './utils.js';
import NumberGame from './number-game.js';
import TwistedSpeechInputConverter from './twisted-speech-input-converter.js';
import Options from './options.js';
import Pages from './pages.js';
import Letterizer from './letterizer.js';

export default class SeeAndSpeakGame extends NumberGame {

	constructor() {

		super('see-and-speak', 'see-and-speak-menu', 'see-and-speak-game');

		if (!this.getNativeSpeechRecognition() && !this.getSpeechRecognitionConstructor()) {
			// the variable is defined

			let optionsArea = this.menuElem.querySelector('.options');
			optionsArea.innerHTML = '<div class="error">Dieser Browser unterstützt keine Spracheingabe.</div>';
			return;
		}

		let defaultOptions = {
			arity: 2,
			numTasks: 5,
			twistedSpeechMode: 'zehneins',
		};

		this.options = new Options('see-and-speak-menu', defaultOptions, true);

		this.twistedSpeechModeConverter = new TwistedSpeechInputConverter();
		this.letterizer = new Letterizer();

		var startButton = this.menuElem.querySelector('.start');

		startButton.addEventListener('click', () => {

			this.startGame();
		});

		this.taskElem = this.gameElem.querySelector('.task');
		this.answerElem = this.taskElem;
		
		this.debugOutputElem = this.gameElem.querySelector('.debugOutput');
		
		this.recognitionAutoStartEnabled = true;

		this.microphoneButton = this.gameElem.querySelector('.microphone');
		this.microphoneButton.addEventListener('click', evt => {

			if (this.recognitionRunning) {
				
				this.stopRecognition();
				this.recognitionAutoStartEnabled = false;
			}
			else {
				this.startRecognition();
				this.recognitionAutoStartEnabled = true;
			}
		});

		this.recognitionRunning = false;
		this.recognitionRightResultGiven = true;
		this.nativeRecognitionStartId = 0;
		
		this.debugModeEnabled = false;
		
		Pages.INSTANCE.addPageChangedHandler((oldPageId, newPageId) => {
			
			if(oldPageId == 'see-and-speak-game') {
				
				this.stopRecognition();
			}
		});
		
		this.debugModeCheckbox = this.menuElem.querySelector("#seeAndSpeak-debugModeEnabled");
		
		this.debugModeCheckbox.addEventListener('input', evt => {
			
			if(this.debugModeCheckbox.checked) {			
				
				this.debugModeEnabled = true;
				this.gameElem.classList.add('debugModeEnabled');
				localStorage.setItem('seeAndSpeak-debugModeEnabled', 'true');
			}
			else {
				
				this.debugModeEnabled = false;
				this.gameElem.classList.remove('debugModeEnabled');
				localStorage.removeItem('seeAndSpeak-debugModeEnabled');
			}
		});
		
		let lsDebugModeEnabled = localStorage.getItem('seeAndSpeak-debugModeEnabled')
		if(lsDebugModeEnabled) {
			
			this.gameElem.classList.add('debugModeEnabled');
			this.debugModeEnabled = true;
			this.debugModeCheckbox.checked = true;
		}		
	}

	getSpeechRecognitionConstructor() {

		return window.SpeechRecognition || window.webkitSpeechRecognition;
	}

	getNativeSpeechRecognition() {

		let capacitor = window.Capacitor;

		if (!capacitor || !capacitor.isNativePlatform || !capacitor.isNativePlatform()) {
			return null;
		}

		if (!capacitor.isPluginAvailable || !capacitor.isPluginAvailable('SpeechRecognition')) {
			return null;
		}

		if (!capacitor.nativePromise) {
			return null;
		}

		return {
			available: () => capacitor.nativePromise('SpeechRecognition', 'available', {}),
			checkPermissions: () => capacitor.nativePromise('SpeechRecognition', 'checkPermissions', {}),
			requestPermissions: () => capacitor.nativePromise('SpeechRecognition', 'requestPermissions', {}),
			start: options => capacitor.nativePromise('SpeechRecognition', 'start', options),
			stop: () => capacitor.nativePromise('SpeechRecognition', 'stop', {})
		};
	}

	async startRecognition() {

		if (this.recognitionRunning) {
			return;
		}

		let nativeSpeechRecognition = this.getNativeSpeechRecognition();

		if (nativeSpeechRecognition) {
			await this.startNativeRecognition(nativeSpeechRecognition);
			return;
		}

		if (!this.recognition) {
			return;
		}

		try {
			this.recognition.start();
		}
		catch (error) {
			this.showRecognitionMessage('Spracheingabe konnte nicht gestartet werden: ' + error.message);
		}
	}

	async startNativeRecognition(nativeSpeechRecognition) {

		let startId = ++this.nativeRecognitionStartId;

		this.recognitionRunning = true;
		this.microphoneButton.classList.add('active');
		this.showRecognitionMessage('Aufnahme läuft...');

		try {
			let available = await nativeSpeechRecognition.available();

			if (!available.available) {
				this.showRecognitionMessage('Native Spracheingabe ist auf diesem Gerät nicht verfügbar.');
				return;
			}

			let permissions = await nativeSpeechRecognition.checkPermissions();

			if (permissions.speechRecognition !== 'granted') {
				permissions = await nativeSpeechRecognition.requestPermissions();
			}

			if (permissions.speechRecognition !== 'granted') {
				this.showRecognitionMessage('Spracheingabe ist nicht freigegeben: ' + permissions.speechRecognition);
				return;
			}

			if (this.debugModeEnabled) {
				this.showRecognitionMessage('Berechtigungen ok. Bitte jetzt sprechen...');
			}

			let result = await nativeSpeechRecognition.start({
				language: 'de-DE',
				maxResults: 5,
				partialResults: true,
				popup: false,
				timeout: 2.5,
				partialResultDelay: 0.75
			});

			if (startId !== this.nativeRecognitionStartId) {
				return;
			}

			let matches = result.matches || [];

			if (matches.length == 0) {
				this.showRecognitionMessage('Keine Spracheingabe erkannt.');
				return;
			}

			this.processRecognizedTranscripts(matches);
		}
		catch (error) {
			let message = error && error.message ? error.message : String(error);
			this.showRecognitionMessage('Native Spracheingabe-Fehler: ' + message);
		}
		finally {
			if (startId === this.nativeRecognitionStartId) {
				this.recognitionRunning = false;
				this.microphoneButton.classList.remove('active');
			}
		}
	}

	stopRecognition() {

		if (!this.recognition) {
			let nativeSpeechRecognition = this.getNativeSpeechRecognition();
			if (nativeSpeechRecognition) {
				this.nativeRecognitionStartId++;
				nativeSpeechRecognition.stop().catch(() => {});
				this.recognitionRunning = false;
				this.microphoneButton.classList.remove('active');
			}
			return;
		}

		try {
			this.recognition.stop();
		}
		catch (error) {
			// Some WebKit versions throw if recognition already ended.
		}
	}

	showRecognitionMessage(message) {

		if (this.debugOutputElem) {
			this.debugOutputElem.textContent = message;
		}
		console.log(message);
	}

	processRecognizedTranscripts(transcripts) {

		let result;

		if (this.debugModeEnabled) {

			let debugOutputHtml =
				'<p>Aufgabe: ' +
					this.rightResult +
				'</p>' +
				'<p>Spracheingabe:</p>'
				;

			debugOutputHtml += transcripts.join('<br>');
			this.debugOutputElem.innerHTML = debugOutputHtml;
		}

		if (this.recognizedTranscriptsMatchRightResult(transcripts)) {
			result = this.rightResult;
		}
		else if (this.options.twistedSpeechMode == 'zehneins') {

			let currentArity = this.options.arity;
			let speechRecognitionEvent = {
				results: [
					transcripts.map(transcript => ({ transcript }))
				]
			};
			result = this.twistedSpeechModeConverter.convertTwistedSpeechRecognition(currentArity, speechRecognitionEvent);
		}
		else {
			result = this.convertTranscriptToNumber(transcripts[0]);
		}

		if (result == this.rightResult) {

			this.recognitionRightResultGiven = true;
			this.stopRecognition();
			this.taskElem.classList.remove("error");
			super.processCorrectAnswer();
		}
		else {

			this.numErrors++;
			this.currentTaskNumErrors++;
			this.recognitionRightResultGiven = false;
			this.taskElem.classList.add("error");
		}
	}

	recognizedTranscriptsMatchRightResult(transcripts) {

		let expectedSpeechInput = this.getExpectedSpeechInput();
		let normalizedExpectedSpeechInput = this.normalizeSpeechInput(expectedSpeechInput);

		for (let transcript of transcripts) {

			if (this.convertTranscriptToNumber(transcript) == this.rightResult) {
				return true;
			}

			if (this.normalizeSpeechInput(transcript) == normalizedExpectedSpeechInput) {
				return true;
			}
		}

		return false;
	}

	getExpectedSpeechInput() {

		if (this.options.twistedSpeechMode == 'traditionellVerdreht') {
			return this.letterizer.letterizeTraditionellVerdrehtNumber(this.rightResult);
		}

		return this.letterizer.letterizeZehnEinsNumber(this.rightResult);
	}

	normalizeSpeechInput(speechInput) {

		return speechInput
			.toString()
			.toLowerCase()
			.replaceAll(' ', '')
			.replaceAll('-', '')
			.replaceAll('.', '')
			.replaceAll(',', '');
	}

	convertTranscriptToNumber(transcript) {

		let normalizedTranscript = transcript
			.toString()
			.trim()
			.replaceAll(' ', '');

		if (/^\d+$/.test(normalizedTranscript)) {
			return parseInt(normalizedTranscript);
		}

		return null;
	}

	initSpeechRecognitionIfNeeded() {

		if (this.getNativeSpeechRecognition()) {
			return;
		}

		if (!this.recognition) {

			let SpeechRecognition = this.getSpeechRecognitionConstructor();

			let recognition = new SpeechRecognition();
			recognition.continuous = false;
			recognition.lang = 'de-DE';
			recognition.interimResults = false;
			recognition.maxAlternatives = 10;

			let timeout = 0;

			recognition.onresult = event => {

				let speechRecognitionResultList = event.results[0];
				let transcripts = [];

				for (let speechRecognitionAlternative of speechRecognitionResultList) {
					transcripts.push(speechRecognitionAlternative.transcript);
				}

				console.log(transcripts);
				clearTimeout(timeout);
				this.processRecognizedTranscripts(transcripts);
			};

			recognition.onstart = () => {

				this.recognitionRunning = true;
				this.microphoneButton.classList.add('active');
			};

			recognition.onend = () => {

				this.recognitionRunning = false;
				this.microphoneButton.classList.remove('active');

				if (!this.recognitionRightResultGiven && this.recognitionAutoStartEnabled) {
					
					if(Pages.INSTANCE.getCurrentId() == 'see-and-speak-game') {
						this.startRecognition();
					}
				}
			}

			recognition.onnomatch = () => {

			};

			recognition.onerror = event => {

				let message = 'Spracheingabe-Fehler: ' + event.error;
				if (event.message) {
					message += ' (' + event.message + ')';
				}
				this.showRecognitionMessage(message);
			}

			this.recognition = recognition;
		}
	}

	startGame() {
		
		if(this.debugModeEnabled) {
			this.gameElem.classList.add('debugModeEnabled');
		}
		else {
			this.gameElem.classList.remove('debugModeEnabled');
		}
		
		this.initSpeechRecognitionIfNeeded();
		
		this.debugOutputElem.innerHTML = '';
		
		this.recognitionAutoStartEnabled = true;
		
		super.startGame();
	}

	finishGame() {

		super.finishGame();
		this.stopRecognition();
	}

	generateNewTask() {

		let random;

		if (this.options.arity == 2) {

			random = this.getRandomNumber(11, 99);

			while (random.toString().endsWith('0')) {
				random = this.getRandomNumber(11, 99);
			}
		}
		else {

			random = this.getRandomNumber(111, 999);

			while (random.toString().endsWith('0') || random.toString().charAt(1) == "0") {
				random = this.getRandomNumber(111, 999);
			}
		}

		let task = {
			problem: random,
			rightResult: random
		};
		
		this.recognitionRightResultGiven = false;
		this.startRecognition();

		return task;
	}

	presentNewTask(task) {

		this.taskElem.textContent = task.problem;
	}

	provideCustomLevelLabelText(levelOptions) {

		let labelText =
			levelOptions.arity + '-stellig, ' +
			levelOptions.numTasks + ' Aufgaben, ' +
			levelOptions.twistedSpeechMode;

		return labelText;
	}

	getGameNameTranslation() {

		return 'Sehen & Sprechen';
	}

	getGameNameTranslationForFileName() {

		return 'sehen-und-sprechen';
	}

}
