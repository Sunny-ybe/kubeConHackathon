"use client";
import { useCallback, useEffect, useState } from "react";

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

/** Read aloud with speechSynthesis. Call speak() only from a tap (iOS needs a user gesture). */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    synth()?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, lang?: string) => {
    const s = synth();
    if (!s || !text.trim()) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (lang) {
      u.lang = lang;
      const base = lang.split("-")[0];
      const voice = s.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(base));
      if (voice) u.voice = voice;
    }
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    s.speak(u);
    setSpeaking(true);
  }, []);

  useEffect(() => () => synth()?.cancel(), []);

  return { speaking, speak, stop };
}
