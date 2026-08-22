import Image from "next/image";
import Link from "next/link";
import { getHomepageData, type ArticleCard } from "@/sanity/lib/queries";
import { urlForImage } from "@/sanity/lib/image";

export const revalidate = 60;

function formatDate(date?: string) {
  if (!date) return "Latest report";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function storyHref(article: ArticleCard) {
  return `/articles/${article.slug.current}`;
}

function StoryImage({ article, priority = false }: { article: ArticleCard; priority?: boolean }) {
  if (!article.heroImage) {
    return <div className="story-image-fallback" aria-hidden="true"><span>Headline</span></div>;
  }

  return (
    <Image
      src={urlForImage(article.heroImage).width(1400).height(900).url()}
      alt={article.heroImageAlt || article.title}
      fill
      priority={priority}
      sizes="(max-width: 760px) 100vw, (max-width: 1100px) 66vw, 740px"
    />
  );
}

function StoryMeta({ article }: { article: ArticleCard }) {
  return <p className="story-meta"><span>{article.category?.title || "The briefing"}</span><span aria-hidden="true">·</span>{formatDate(article.publishedAt)}</p>;
}

function CompactStory({ article }: { article: ArticleCard }) {
  return (
    <article className="compact-story">
      <Link href={storyHref(article)} className="compact-image"><StoryImage article={article} /></Link>
      <div>
        <StoryMeta article={article} />
        <h3><Link href={storyHref(article)}>{article.title}</Link></h3>
      </div>
    </article>
  );
}

export default async function Home() {
  let data;
  try {
    data = await getHomepageData();
  } catch {
    data = { latestArticles: [] };
  }

  const homepage = data.homepage;
  const leadStory = homepage?.leadStory || data.latestArticles[0];
  const usedIds = new Set(leadStory ? [leadStory._id] : []);
  const chooseStories = (preferred: ArticleCard[] | undefined, count: number) => {
    const picked: ArticleCard[] = [];
    for (const article of [...(preferred || []), ...data.latestArticles]) {
      if (!article || usedIds.has(article._id)) continue;
      usedIds.add(article._id);
      picked.push(article);
      if (picked.length === count) break;
    }
    return picked;
  };
  const secondaryStories = chooseStories(homepage?.secondaryStories, 2);
  const featuredStories = chooseStories(homepage?.featuredStories, 6);
  const trendingStories = (homepage?.trendingStories || data.latestArticles.filter((article) => article.trending)).filter(
    (article) => article && article._id !== leadStory?._id
  ).slice(0, 4);

  return (
    <main className="homepage">
      {homepage?.breakingNewsBanner?.enabled && homepage.breakingNewsBanner.title && (
        <Link href={homepage.breakingNewsBanner.link || "/"} className="breaking-banner">
          <span>Breaking</span>{homepage.breakingNewsBanner.title}<b aria-hidden="true">→</b>
        </Link>
      )}

      <section className="home-intro page-frame">
        <p className="eyebrow">Independent reporting · {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p>
        <div className="intro-copy">
          <h1>Stories with <em>staying power.</em></h1>
          <p>Clear reporting, sharper context, and the threads that help every headline make sense.</p>
        </div>
      </section>

      {!leadStory ? (
        <section className="empty-state page-frame">
          <p className="eyebrow">From the newsroom</p>
          <h1>We’re preparing the next edition.</h1>
          <p>New stories will appear here as soon as they’re published in Sanity.</p>
          <Link href="/contact" className="text-link">Contact the team <span aria-hidden="true">→</span></Link>
        </section>
      ) : (
        <>
          <section className="lead-grid page-frame">
            <article className="lead-story">
              <Link href={storyHref(leadStory)} className="lead-image">
                <StoryImage article={leadStory} priority />
                {leadStory.breaking && <span className="image-label">Breaking</span>}
              </Link>
              <StoryMeta article={leadStory} />
              <h2><Link href={storyHref(leadStory)}>{leadStory.title}</Link></h2>
              {leadStory.excerpt && <p className="lead-excerpt">{leadStory.excerpt}</p>}
              <Link href={storyHref(leadStory)} className="text-link">Read the story <span aria-hidden="true">→</span></Link>
            </article>

            <aside className="secondary-stories" aria-label="More top stories">
              <div className="section-heading"><span>On the desk</span></div>
              {secondaryStories.map((article) => <CompactStory article={article} key={article._id} />)}
              {secondaryStories.length === 0 && <p className="quiet-copy">More reporting is on its way.</p>}
            </aside>
          </section>

          {trendingStories.length > 0 && (
            <section className="trending-section page-frame">
              <div className="section-heading"><span>Most read</span><span className="section-caption">The stories readers are returning to</span></div>
              <div className="trending-list">
                {trendingStories.map((article, index) => (
                  <Link href={storyHref(article)} key={article._id} className="trending-item">
                    <span className="trending-number">0{index + 1}</span>
                    <span>{article.title}</span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {featuredStories.length > 0 && (
            <section className="latest-section page-frame">
              <div className="section-heading"><span>Latest reporting</span><span className="section-caption">Fresh perspective, thoughtfully reported</span></div>
              <div className="story-grid">
                {featuredStories.map((article) => (
                  <article className="story-card" key={article._id}>
                    <Link href={storyHref(article)} className="card-image"><StoryImage article={article} /></Link>
                    <StoryMeta article={article} />
                    <h3><Link href={storyHref(article)}>{article.title}</Link></h3>
                    {article.excerpt && <p>{article.excerpt}</p>}
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
