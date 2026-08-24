"use client";

import { useEffect, useState } from "react";

type TocSection = { id: string; text: string };

export function StoryToc({ sections }: { sections: TocSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-90px 0px -68% 0px" }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="story-toc" aria-label="In this story">
      <p className="rail-label">In this story</p>
      <ol>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={activeId === section.id ? "is-active" : undefined}
              aria-current={activeId === section.id ? "true" : undefined}
            >
              {section.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
