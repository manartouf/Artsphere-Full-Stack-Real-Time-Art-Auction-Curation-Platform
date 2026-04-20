import { useState, useEffect, useRef } from "react";

// Cycles through `words`, typing and erasing each in a loop.
export const useTypingEffect = (
  words,
  { typeSpeed = 75, deleteSpeed = 45, pauseAfterType = 1800, pauseAfterDelete = 300 } = {}
) => {
  const [displayed, setDisplayed]   = useState("");
  const [wordIndex, setWordIndex]   = useState(0);
  const [phase, setPhase]           = useState("typing"); // "typing" | "pausing" | "deleting" | "waiting"
  const timerRef = useRef(null);

  useEffect(() => {
    if (!words || words.length === 0) return;
    const word = words[wordIndex % words.length];

    const clear = () => clearTimeout(timerRef.current);

    if (phase === "typing") {
      if (displayed.length < word.length) {
        timerRef.current = setTimeout(() =>
          setDisplayed(word.slice(0, displayed.length + 1)), typeSpeed);
      } else {
        timerRef.current = setTimeout(() => setPhase("deleting"), pauseAfterType);
      }
    } else if (phase === "deleting") {
      if (displayed.length > 0) {
        timerRef.current = setTimeout(() =>
          setDisplayed(prev => prev.slice(0, -1)), deleteSpeed);
      } else {
        timerRef.current = setTimeout(() => {
          setWordIndex(i => (i + 1) % words.length);
          setPhase("typing");
        }, pauseAfterDelete);
      }
    }

    return clear;
  }, [displayed, phase, wordIndex, words, typeSpeed, deleteSpeed, pauseAfterType, pauseAfterDelete]);

  return displayed;
};