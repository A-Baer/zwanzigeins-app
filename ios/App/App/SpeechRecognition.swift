import AVFoundation
import Capacitor
import Speech

@objc(SpeechRecognition)
public class SpeechRecognition: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "SpeechRecognition"
    public let jsName = "SpeechRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isListening", returnType: CAPPluginReturnPromise)
    ]

    private var speechRecognizer: SFSpeechRecognizer?
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var activeCall: CAPPluginCall?

    @objc func available(_ call: CAPPluginCall) {
        let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "de-DE"))
        call.resolve(["available": recognizer?.isAvailable ?? false])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["speechRecognition": speechPermissionState()])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { status in
            if status != .authorized {
                DispatchQueue.main.async {
                    call.resolve(["speechRecognition": self.speechPermissionState()])
                }
                return
            }

            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    call.resolve(["speechRecognition": granted ? "granted" : "denied"])
                }
            }
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        if activeCall != nil {
            call.reject("Ongoing speech recognition")
            return
        }

        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            call.reject("Missing speech recognition permission")
            return
        }

        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                guard granted else {
                    call.reject("Missing microphone permission")
                    return
                }

                self.startRecognition(call)
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        stopRecognition()
        activeCall?.resolve(["matches": []])
        activeCall = nil
        call.resolve()
    }

    @objc func isListening(_ call: CAPPluginCall) {
        call.resolve(["listening": audioEngine?.isRunning ?? false])
    }

    private func startRecognition(_ call: CAPPluginCall) {
#if targetEnvironment(simulator)
        call.reject("Speech recognition recording is not available in the iOS Simulator. Please test this feature on a physical iPhone.")
        return
#else
        let language = call.getString("language") ?? "de-DE"
        let maxResults = min(max(call.getInt("maxResults") ?? 5, 1), 5)

        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: language))

        guard let speechRecognizer, speechRecognizer.isAvailable else {
            call.reject("Speech recognition is not available")
            return
        }

        let audioSession = AVAudioSession.sharedInstance()

        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        }
        catch {
            call.reject("Audio session could not be started: \(error.localizedDescription)")
            return
        }

        guard audioSession.isInputAvailable else {
            call.reject("No microphone input is available")
            return
        }

        audioEngine = AVAudioEngine()
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest?.shouldReportPartialResults = false

        guard let audioEngine, let recognitionRequest else {
            call.reject("Speech recognition could not be initialized")
            return
        }

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        activeCall = call

        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { result, error in
            if let result {
                let matches = Array(result.transcriptions.prefix(maxResults).map(\.formattedString))

                if result.isFinal || !matches.isEmpty {
                    self.stopRecognition()
                    self.activeCall?.resolve(["matches": matches])
                    self.activeCall = nil
                }
            }

            if let error, self.activeCall != nil {
                self.stopRecognition()
                self.activeCall?.reject(error.localizedDescription)
                self.activeCall = nil
            }
        }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            recognitionRequest.append(buffer)
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
        }
        catch {
            stopRecognition()
            activeCall = nil
            call.reject("Speech recognition could not be started: \(error.localizedDescription)")
        }
#endif
    }

    private func stopRecognition() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        audioEngine = nil
    }

    private func speechPermissionState() -> String {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            return AVAudioSession.sharedInstance().recordPermission == .denied ? "denied" : "granted"
        case .denied, .restricted:
            return "denied"
        case .notDetermined:
            return "prompt"
        @unknown default:
            return "prompt"
        }
    }
}
