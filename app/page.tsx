import Image from "next/image";
import Link from "next/link";
import { getHomepageData, type ArticleCard } from "@/sanity/lib/queries";
import { urlForImage } from "@/sanity/lib/image";

export const revalidate = 0;

function formatDate(date?: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatShortDate(date?: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function storyHref(article: ArticleCard) {
  return `/articles/${article.slug.current}`;
}

function StoryImage({
  article,
  priority = false,
}: {
  article: ArticleCard;
  priority?: boolean;
}) {
  if (!article.heroImage)
    return (
      <div className="story-image-fallback" aria-hidden="true">
        <span>Headline</span>
      </div>
    );

  return (
    <Image
      src={urlForImage(article.heroImage).width(1400).height(900).url()}
      alt={article.heroImageAlt || article.title}
      fill
      priority={priority}
      sizes="(max-width: 760px) 100vw, (max-width: 1100px) 66vw, 780px"
    />
  );
}

function RailThumb({ article }: { article: ArticleCard }) {
  if (!article.heroImage)
    return (
      <div className="rail-thumb-fallback" aria-hidden="true">
        H
      </div>
    );
  return (
    <div className="rail-thumb">
      <Image
        src={urlForImage(article.heroImage).width(320).height(240).url()}
        alt={article.heroImageAlt || article.title}
        fill
        sizes="120px"
      />
    </div>
  );
}

export default async function Home() {
  let data;
  try {
    data = await getHomepageData();
  } catch {
    data = { homepage: {}, latestArticles: [] };
  }

  const homepage = data.homepage;
  const latestArticles = data.latestArticles || [];
  const leadStory = homepage?.leadStory || latestArticles[0];
  const usedIds = new Set(leadStory ? [leadStory._id] : []);
  const chooseStories = (
    preferred: ArticleCard[] | undefined,
    count: number,
  ) => {
    const picked: ArticleCard[] = [];
    for (const article of [...(preferred || []), ...latestArticles]) {
      if (!article || usedIds.has(article._id)) continue;
      usedIds.add(article._id);
      picked.push(article);
      if (picked.length === count) break;
    }
    return picked;
  };
  const secondaryStories = chooseStories(homepage?.secondaryStories, 7);
  const currentBlogs = chooseStories(homepage?.featuredStories, 8);
  const trendingStories = (
    homepage?.trendingStories ||
    latestArticles.filter((article) => article.trending)
  )
    .filter((article) => article && article._id !== leadStory?._id)
    .slice(0, 4);

  return (
    <main className="homepage">
      {homepage?.breakingNewsBanner?.enabled &&
        homepage.breakingNewsBanner.title && (
          <Link
            href={homepage.breakingNewsBanner.link || "#"}
            className="breaking-banner"
          >
            <span className="breaking-tag">Breaking</span>
            <span className="breaking-text">
              {homepage.breakingNewsBanner.title}
            </span>
            <b aria-hidden="true">→</b>
          </Link>
        )}

      {!leadStory ? (
        <section className="empty-state page-frame">
          <p className="eyebrow">From the newsroom</p>
          <h1>We&rsquo;re preparing the next edition.</h1>
          <p>
            New stories will appear here as soon as they&rsquo;re published.
          </p>
          <Link href="/contact" className="text-link">
            Contact the team <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        <>
          <section className="front-page page-frame">
            <article className="lead-story">
              <Link href={storyHref(leadStory)} className="lead-image">
                <StoryImage article={leadStory} priority />
                {leadStory.breaking && (
                  <span className="image-label">Breaking</span>
                )}
              </Link>
              <div className="lead-copy">
                <p className="kicker-row">
                  {leadStory.category && (
                    <Link
                      href={`/categories/${leadStory.category.slug?.current}`}
                      className="kicker"
                    >
                      {leadStory.category.title}
                    </Link>
                  )}
                  <span className="meta-date">
                    {formatDate(leadStory.publishedAt)}
                  </span>
                </p>
                <h1>
                  <Link href={storyHref(leadStory)}>{leadStory.title}</Link>
                </h1>
                {leadStory.excerpt && (
                  <p className="lead-excerpt">{leadStory.excerpt}</p>
                )}
                {leadStory.author?.name && (
                  <p className="byline">
                    By {leadStory.author.name}
                    {leadStory.author.role ? ` · ${leadStory.author.role}` : ""}
                  </p>
                )}
              </div>
            </article>

            <aside className="latest-rail" aria-label="The latest">
              <div className="rail-head">
                <h2>The latest</h2>
              </div>
              {secondaryStories.map((article) => (
                <Link
                  href={storyHref(article)}
                  key={article._id}
                  className="rail-item"
                >
                  <RailThumb article={article} />
                  <div className="rail-item-body">
                    <p className="kicker">
                      {article.category?.title || "Headline"}{" "}
                      <span aria-hidden="true">·</span>{" "}
                      <span className="meta-time">
                        {formatShortDate(article.publishedAt)}
                      </span>
                    </p>
                    <h3>{article.title}</h3>
                  </div>
                </Link>
              ))}
              {secondaryStories.length === 0 && (
                <p className="quiet-copy">More reporting is on its way.</p>
              )}
              <Link href="/blogs" className="rail-archive">
                Browse all blogs <span aria-hidden="true">→</span>
              </Link>
            </aside>
          </section>

          {trendingStories.length > 0 && (
            <section className="most-read">
              <div className="most-read-inner page-frame">
                <div className="most-read-head">
                  <h2>Most read</h2>
                  <span>What readers are returning to</span>
                </div>
                <ol className="most-read-grid">
                  {trendingStories.map((article, index) => (
                    <li key={article._id}>
                      <Link
                        href={storyHref(article)}
                        className="most-read-item"
                      >
                        <span className="most-read-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="most-read-title">{article.title}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {currentBlogs.length > 0 && (
            <section className="latest-section page-frame">
              <header className="section-head latest-section-head">
                <div>
                  <p className="eyebrow">Fresh from the desk</p>
                  <h2>Current blogs</h2>
                </div>
                <Link href="/blogs" className="archive-link">
                  View all blogs <span aria-hidden="true">→</span>
                </Link>
              </header>
              <div className="story-grid">
                {currentBlogs.map((article) => (
                  <article className="story-card" key={article._id}>
                    <Link
                      href={storyHref(article)}
                      className="card-image"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <StoryImage article={article} />
                    </Link>
                    <p className="kicker-row">
                      <span className="kicker">
                        {article.category?.title || "Headline"}
                      </span>
                      <span className="meta-date">
                        {formatDate(article.publishedAt)}
                      </span>
                    </p>
                    <h3>
                      <Link href={storyHref(article)}>{article.title}</Link>
                    </h3>
                    {article.excerpt && (
                      <p className="card-excerpt">{article.excerpt}</p>
                    )}
                    <Link href={storyHref(article)} className="text-link">
                      Read story <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
