import Image from "next/image";
import Link from "next/link";
import { getHomepageData, type ArticleCard } from "@/sanity/lib/queries";
import { urlForImage } from "@/sanity/lib/image";

export const revalidate = 0;

function formatDate(date?: string) {
  if (!date) return "Latest report";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function storyHref(article: ArticleCard) {
  return `/articles/${article.slug.current}`;
}

function StoryImage({ article, priority = false }: { article: ArticleCard; priority?: boolean }) {
  if (!article.heroImage) return <div className="story-image-fallback" aria-hidden="true"><span>Headline</span></div>;

  return (
    <Image
      src={urlForImage(article.heroImage).width(1400).height(900).url()}
      alt={article.heroImageAlt || article.title}
      fill
      priority={priority}
      sizes="(max-width: 760px) 100vw, (max-width: 1100px) 66vw, 800px"
    />
  );
}

function StoryMeta({ article }: { article: ArticleCard }) {
  return <p className="story-meta"><span>{article.category?.title || "The briefing"}</span><span aria-hidden="true">/</span>{formatDate(article.publishedAt)}</p>;
}

function DeskStory({ article, index }: { article: ArticleCard; index: number }) {
  return (
    <article className="desk-story">
      <span className="desk-story-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <div>
        <StoryMeta article={article} />
        <h3><Link href={storyHref(article)}>{article.title}</Link></h3>
      </div>
      <Link href={storyHref(article)} className="desk-story-link" aria-label={`Read ${article.title}`}><span aria-hidden="true">→</span></Link>
    </article>
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
  const chooseStories = (preferred: ArticleCard[] | undefined, count: number) => {
    const picked: ArticleCard[] = [];
    for (const article of [...(preferred || []), ...latestArticles]) {
      if (!article || usedIds.has(article._id)) continue;
      usedIds.add(article._id);
      picked.push(article);
      if (picked.length === count) break;
    }
    return picked;
  };
  const secondaryStories = chooseStories(homepage?.secondaryStories, 2);
  const featuredStories = chooseStories(homepage?.featuredStories, 6);
  const trendingStories = (homepage?.trendingStories || latestArticles.filter((article) => article.trending)).filter(
    (article) => article && article._id !== leadStory?._id
  ).slice(0, 4);

  return (
    <main className="homepage">
      {homepage?.breakingNewsBanner?.enabled && homepage.breakingNewsBanner.title && (
        <Link href={homepage.breakingNewsBanner.link || "/"} className="breaking-banner">
          <span>Breaking</span><span>{homepage.breakingNewsBanner.title}</span><b aria-hidden="true">→</b>
        </Link>
      )}

      <section className="home-masthead page-frame">
        <h1>The stories <em>shaping today.</em></h1>
      </section>

      {!leadStory ? (
        <section className="empty-state page-frame">
          <p className="eyebrow">From the newsroom</p>
          <h1>We’re preparing the next edition.</h1>
          <p>New stories will appear here as soon as they’re published.</p>
          <Link href="/contact" className="story-action">Contact the team <span aria-hidden="true">→</span></Link>
        </section>
      ) : (
        <>
          <section className="front-page page-frame">
            <article className="front-page-lead">
              <Link href={storyHref(leadStory)} className="front-page-image">
                <StoryImage article={leadStory} priority />
                {leadStory.breaking && <span className="image-label">Breaking</span>}
                <span className="feature-marker"><span>Lead story</span><b aria-hidden="true">↗</b></span>
              </Link>
              <div className="front-page-copy">
                <StoryMeta article={leadStory} />
                <h2><Link href={storyHref(leadStory)}>{leadStory.title}</Link></h2>
                {leadStory.excerpt && <p>{leadStory.excerpt}</p>}
                <Link href={storyHref(leadStory)} className="story-action">Read full story <span aria-hidden="true">→</span></Link>
              </div>
            </article>

            <aside className="desk-rail" aria-label="More stories">
              <div className="desk-rail-heading"><span>On the desk</span><span>{String(secondaryStories.length).padStart(2, "0")} stories</span></div>
              {secondaryStories.map((article, index) => <DeskStory article={article} index={index} key={article._id} />)}
              {secondaryStories.length === 0 && <p className="quiet-copy">More reporting is on its way.</p>}
            </aside>
          </section>

          {trendingStories.length > 0 && (
            <section className="reader-radar">
              <div className="reader-radar-inner page-frame">
                <div className="radar-heading"><p className="eyebrow">Reader radar</p><h2>Stories readers are returning to.</h2></div>
                <div className="radar-grid">
                  {trendingStories.map((article, index) => (
                    <Link href={storyHref(article)} key={article._id} className="radar-story">
                      <span className="radar-number">{String(index + 1).padStart(2, "0")}</span><span>{article.title}</span><i aria-hidden="true">↗</i>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {featuredStories.length > 0 && (
            <section className="archive-section page-frame">
              <div className="archive-heading">
                <div><p className="eyebrow">From the newsroom</p><h2>Latest reporting</h2></div>
                <span>{String(featuredStories.length).padStart(2, "0")} fresh stories</span>
              </div>
              <div className="story-grid">
                {featuredStories.map((article, index) => (
                  <article className={`story-card story-card--${index + 1}`} key={article._id}>
                    <Link href={storyHref(article)} className="card-image"><StoryImage article={article} /></Link>
                    <StoryMeta article={article} />
                    <h3><Link href={storyHref(article)}>{article.title}</Link></h3>
                    <Link href={storyHref(article)} className="card-read">Read story <span aria-hidden="true">→</span></Link>
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
