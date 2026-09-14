"use client";

import { useState } from "react";
import { SpeechButton } from "@/components/SpeechButton";

// Original sample copy for the public demo; no saved cards or review history are used.
const samples = [
  { term: "discover", translation: "発見する、見つける", example: "Discover a new word every day." },
  { term: "little by little", translation: "少しずつ", example: "Little by little, my notebook grows." },
  { term: "remember", translation: "覚えている、思い出す", example: "I remember the words in my notebook." },
];

export function LandingDemo() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const sample = samples[index];

  return <div className="landing-demo-wrap">
    <p className="landing-demo-caption">ひと足先に、1枚めくってみよう <span aria-hidden="true">↙</span></p>
    <div className="landing-demo panel pop-shadow" aria-label="学習カードの体験">
      <div className="landing-demo-top"><span className="badge">おためし単語帳</span><span>{index + 1} / {samples.length}</span></div>
      <div className="landing-demo-word" aria-live="polite"><p>この言葉、どんな意味？</p><h2 lang="en">{sample.term}</h2></div>
      <SpeechButton text={sample.term} label="単語を聞く ♪" />
      <div className="landing-demo-answer" id="demo-answer" aria-live="polite">
        {revealed ? <><p className="landing-demo-translation">{sample.translation}</p><p lang="en">{sample.example}</p><SpeechButton text={sample.example} label="例文を聞く ♪" /></> : <p className="landing-demo-hint">まずは意味を思い浮かべてみましょう。</p>}
      </div>
      <div className="landing-demo-controls"><button className="button mint" type="button" aria-expanded={revealed} aria-controls="demo-answer" onClick={() => setRevealed((value) => !value)}>{revealed ? "答えを隠す" : "答えを見る"}</button><button className="text-button" type="button" onClick={() => { setIndex((value) => (value + 1) % samples.length); setRevealed(false); }}>次の単語 <span aria-hidden="true">→</span></button></div>
    </div>
    <p className="landing-note landing-demo-note">ログイン不要の体験用カードです。学習記録は保存されません。</p><span className="landing-demo-spark" aria-hidden="true">✦</span>
  </div>;
}
