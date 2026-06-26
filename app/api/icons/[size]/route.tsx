import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(_req: NextRequest, { params }: { params: { size: string } }) {
  const size = parseInt(params.size) || 192;
  const pad = Math.round(size * 0.18);
  const r = Math.round(size * 0.18);
  const fs = Math.round(size * 0.32);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#166534',
          borderRadius: r,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'sans-serif',
            fontWeight: 900,
            fontSize: fs,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          FC
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
