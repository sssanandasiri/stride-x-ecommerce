import { useEffect, useRef, useState } from "react";

/*
  Wrap anything in <Reveal> and it fades + slides up into place the first
  time it scrolls into view, instead of just appearing instantly. Uses the
  browser's IntersectionObserver API — it watches the wrapped element and
  fires a callback when it crosses into the viewport, which is far cheaper
  than checking scroll position by hand on every scroll event.

  `once` (default true) means it only animates in the first time; set it
  to false if you want the animation to replay every time the element
  scrolls back into view. `delay` staggers multiple Reveals so a row of
  cards cascades in one after another instead of all at once.
*/
export default function Reveal({ children, as: Tag = "div", delay = 0, once = true, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(node);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? " reveal-visible" : ""}${className ? ` ${className}` : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
