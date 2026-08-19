"use client";

import { useEffect, useRef, useState } from "react";

type SpeechButtonProps = {
  text: string;
  lang?: string;
  label?: string;
};

let stopActiveSpeech: (() => void) | null = null;

function findVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const normalizedLang = lang.toLowerCase();
  const language = normalizedLang.split("-")[0];
  return voices.find((voice) => voice.lang.toLowerCase() === normalizedLang)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(`${language}-`));
}

export function SpeechButton({ text, lang = "en-US", label = "音声を再生" }: SpeechButtonProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let synth: SpeechSynthesis | null = null;
    let updateVoices: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      if (!("speechSynthesis" in window)) {
        setSupported(false);
        return;
      }

      synth = window.speechSynthesis;
      updateVoices = () => setVoices(synth?.getVoices() ?? []);
      setSupported(true);
      updateVoices();
      synth.addEventListener("voiceschanged", updateVoices);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (synth && updateVoices) synth.removeEventListener("voiceschanged", updateVoices);
      if (synth && stopRef.current && stopActiveSpeech === stopRef.current) {
        synth.cancel();
        stopRef.current();
      }
      stopRef.current = null;
    };
  }, []);

  function speak() {
    if (!supported || !text.trim()) return;

    const synth = window.speechSynthesis;
    stopActiveSpeech?.();
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    const voice = findVoice(voices, lang);
    if (voice) utterance.voice = voice;

    const stop = () => {
      setSpeaking(false);
      if (stopActiveSpeech === stop) stopActiveSpeech = null;
    };
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = stop;
    utterance.onerror = stop;
    stopActiveSpeech = stop;
    stopRef.current = stop;
    synth.speak(utterance);
  }

  if (supported === false) {
    return <p className="muted">このブラウザでは音声読み上げを利用できません。</p>;
  }

  return <button className="button secondary" type="button" disabled={supported === null} onClick={speak}>{speaking ? "再生中…" : label}</button>;
}
