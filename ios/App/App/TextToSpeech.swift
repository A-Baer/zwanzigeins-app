import AVFoundation
import Capacitor

@objc(TextToSpeech)
public class TextToSpeech: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {

    public let identifier = "TextToSpeech"
    public let jsName = "TextToSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let synthesizer = AVSpeechSynthesizer()
    private var activeCall: CAPPluginCall?

    public override func load() {
        synthesizer.delegate = self
    }

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.resolve()
            return
        }

        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
            activeCall?.resolve()
            activeCall = nil
        }

        let language = call.getString("language") ?? "de-DE"
        let requestedRate = call.getDouble("rate") ?? 1.0
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language)
        utterance.rate = speechRate(from: requestedRate)

        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try audioSession.setActive(true)
        }
        catch {
            call.reject("Text-to-speech audio session could not be started: \(error.localizedDescription)")
            return
        }

        activeCall = call
        synthesizer.speak(utterance)
    }

    @objc func stop(_ call: CAPPluginCall) {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        activeCall?.resolve()
        activeCall = nil
        call.resolve()
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        activeCall?.resolve()
        activeCall = nil
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        activeCall?.resolve()
        activeCall = nil
    }

    private func speechRate(from webSpeechRate: Double) -> Float {
        let clamped = min(max(webSpeechRate, 0.5), 2.0)
        let normalized = Float((clamped - 0.5) / 1.5)
        return AVSpeechUtteranceMinimumSpeechRate + normalized * (AVSpeechUtteranceMaximumSpeechRate - AVSpeechUtteranceMinimumSpeechRate)
    }
}
