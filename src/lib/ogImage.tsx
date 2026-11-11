import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Social preview shared by the landing and the solution pages. The image
// renderer reads static TrueType only, hence the fixed-weight .ttf copies
// of the site's variable fonts.
// the brand, a
// headline in the site's serif, and the product gesture (a highlighted quote).
export const OG_SIZE = { width: 1200, height: 630 };
const fonts = async () => [
  {
    name: 'Newsreader',
    data: await readFile(join(process.cwd(), 'src/app/fonts/newsreader-og.ttf')),
    style: 'normal' as const,
    weight: 500 as const,
  },
  {
    name: 'Newsreader',
    data: await readFile(join(process.cwd(), 'src/app/fonts/newsreader-og-italic.ttf')),
    style: 'italic' as const,
    weight: 500 as const,
  },
  {
    name: 'Hanken',
    data: await readFile(join(process.cwd(), 'src/app/fonts/hanken-grotesk-og.ttf')),
    style: 'normal' as const,
    weight: 600 as const,
  },
];
export async function ogImage({
  eyebrow,
  title,
  quote,
}: {
  eyebrow: string;
  title: string;
  quote: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: '#f6f3ec',
        color: '#15231d',
        fontFamily: 'Hanken',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30 }}>
        <div
          style={{
            display: 'flex',
            width: 52,
            height: 52,
            borderRadius: 14,
            background: '#1d5a44',
          }}
        />
        <span style={{ fontWeight: 600 }}>BRAINMAIL</span>
        <span style={{ color: '#1d5a44' }}>.ai</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#1d5a44',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: 'Newsreader',
            fontSize: title.length > 48 ? 60 : 72,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 28 }}>
          <span
            style={{
              fontFamily: 'Newsreader',
              fontStyle: 'italic',
              background: '#fbe9a0',
              padding: '6px 14px',
              borderRadius: 6,
            }}
          >
            « {quote} »
          </span>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 24,
          color: '#56635b',
        }}
      >
        <span>Logiciel de gestion du courrier par IA · Mistral, France</span>
        <span>www.brainmail.ai</span>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  );
}
